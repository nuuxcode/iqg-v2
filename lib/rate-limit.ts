/**
 * @file lib/rate-limit.ts
 * @description Cookie-based, HMAC-signed daily rate limiter. No external
 * database, no Redis, no Upstash — just a signed cookie that increments per
 * request and resets every 24h. ~50 LOC of pure logic.
 * @module RateLimit
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * The cookie shape is `<base64url(state)>.<hmac(state)>`. State is JSON:
 * `{ count: number, resetAt: number }` (resetAt is a unix ms timestamp).
 *
 * Why HMAC and not JWT: smaller payload, no spec overhead, built into Node's
 * crypto module — no extra dependency. We only need tamper-detection (the
 * counts aren't secrets), and HMAC gives exactly that.
 *
 * Why base64url and not base64: standard base64 uses `+` and `/` which need
 * URL-encoding in the Set-Cookie header. base64url uses `-` and `_` instead.
 *
 * Why a sliding 24h window (not fixed clock midnight): more user-friendly.
 * A user starting at 11:59 PM doesn't see their counter reset 1 minute later.
 *
 * Honest weakness: clearing browser cookies resets the counter. We accept
 * this — the Vercel $5 spend cap is the real safety net. In production I'd
 * switch to Upstash Redis via the Vercel Marketplace.
 */

import { createHmac } from "node:crypto";
import type { RateLimitState } from "./types";

/**
 * Daily request limit per browser. Env-var-driven for easy tuning per env.
 * Default 10 if `DAILY_LIMIT` isn't set.
 */
export const LIMIT = Number(process.env.DAILY_LIMIT ?? 10);

/** 24h in milliseconds — the sliding window length. */
const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Pull the signing secret from env. Throws if missing — better to crash loudly
 * than silently issue forgeable cookies.
 *
 * @returns {string} The 32-byte hex secret used to sign cookies.
 * @throws {Error} When `RATELIMIT_SECRET` is not set in the environment.
 */
function getSecret(): string {
  const s = process.env.RATELIMIT_SECRET;
  if (!s) throw new Error("RATELIMIT_SECRET not set");
  return s;
}

/**
 * Sign a payload with HMAC-SHA256.
 *
 * @param {string} payload - The base64url-encoded state.
 * @returns {string} Hex digest of the HMAC.
 */
function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/**
 * Encode + sign a state object into a cookie-safe string.
 *
 * @param {RateLimitState} state - `{ count, resetAt }` to encode.
 * @returns {string} Cookie value of the form `<base64url>.<hmac>`.
 */
export function buildCookie(state: RateLimitState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/**
 * Parse + verify a cookie. Returns null on any failure path (missing, bad
 * signature, bad JSON) — callers treat null as "no cookie, start fresh".
 *
 * @param {string | undefined} raw - The raw cookie value from the request.
 * @returns {RateLimitState | null} The decoded state, or null if invalid.
 */
export function parseCookie(raw: string | undefined): RateLimitState | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot < 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (sign(payload) !== sig) return null;
  try {
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as RateLimitState;
  } catch {
    return null;
  }
}

/**
 * The core rate-limit operation. Reads the current cookie, decides whether
 * this request is allowed, and returns the next cookie value to send back.
 *
 * Behavior:
 *   - Missing or tampered cookie  -> start fresh window, count=1.
 *   - Cookie expired (now > resetAt) -> start fresh window, count=1.
 *   - count >= LIMIT             -> deny (ok=false). Cookie value unchanged.
 *   - count < LIMIT              -> allow, increment count, refresh cookie.
 *
 * @param {string | undefined} rawCookie - Raw cookie value from the request.
 * @returns {object} Decision + new cookie value.
 * @returns {boolean} return.ok - true if the request is allowed.
 * @returns {number}  return.remaining - Requests left in the current window.
 * @returns {number}  return.resetAt - Unix ms when the window resets.
 * @returns {string}  return.newCookie - Cookie value to set on the response.
 */
export function checkAndIncrement(rawCookie: string | undefined): {
  ok: boolean;
  remaining: number;
  resetAt: number;
  newCookie: string;
} {
  const now = Date.now();
  let state = parseCookie(rawCookie);
  if (!state || now > state.resetAt) {
    state = { count: 0, resetAt: now + WINDOW_MS };
  }
  if (state.count >= LIMIT) {
    return { ok: false, remaining: 0, resetAt: state.resetAt, newCookie: buildCookie(state) };
  }
  const next: RateLimitState = { count: state.count + 1, resetAt: state.resetAt };
  return { ok: true, remaining: LIMIT - next.count, resetAt: next.resetAt, newCookie: buildCookie(next) };
}
