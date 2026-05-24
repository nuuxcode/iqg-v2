import { describe, expect, test } from "vitest";

process.env.RATELIMIT_SECRET = "test-secret-32-chars-1234567890abcd";

const { parseCookie, buildCookie, checkAndIncrement, LIMIT } = await import("@/lib/rate-limit");

describe("rate-limit cookie", () => {
  test("buildCookie + parseCookie round-trips", () => {
    const state = { count: 3, resetAt: Date.now() + 1000 };
    const c = buildCookie(state);
    expect(parseCookie(c)).toEqual(state);
  });

  test("parseCookie returns null for missing cookie", () => {
    expect(parseCookie(undefined)).toBeNull();
  });

  test("parseCookie returns null for tampered cookie", () => {
    const state = { count: 3, resetAt: Date.now() + 1000 };
    const c = buildCookie(state);
    const tampered = c.slice(0, -2) + "ff";
    expect(parseCookie(tampered)).toBeNull();
  });

  test("checkAndIncrement allows first request", () => {
    const r = checkAndIncrement(undefined);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(LIMIT - 1);
  });

  test("checkAndIncrement blocks when count >= LIMIT", () => {
    const state = { count: LIMIT, resetAt: Date.now() + 1000 };
    const r = checkAndIncrement(buildCookie(state));
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(0);
  });

  test("checkAndIncrement resets when window expired", () => {
    const state = { count: LIMIT, resetAt: Date.now() - 1000 };
    const r = checkAndIncrement(buildCookie(state));
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(LIMIT - 1);
  });
});
