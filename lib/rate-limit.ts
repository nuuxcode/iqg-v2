import { createHmac } from "node:crypto";
import type { RateLimitState } from "./types";

export const LIMIT = Number(process.env.DAILY_LIMIT ?? 10);
const WINDOW_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.RATELIMIT_SECRET;
  if (!s) throw new Error("RATELIMIT_SECRET not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function buildCookie(state: RateLimitState): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

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
