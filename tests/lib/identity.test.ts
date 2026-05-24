// @vitest-environment happy-dom
import { describe, expect, test, beforeEach } from "vitest";
import { getOrCreateUserId } from "@/lib/identity";

describe("getOrCreateUserId", () => {
  beforeEach(() => localStorage.clear());

  test("creates new UUID on first call", () => {
    const id = getOrCreateUserId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("returns same UUID on subsequent calls", () => {
    const a = getOrCreateUserId();
    const b = getOrCreateUserId();
    expect(a).toBe(b);
  });
});
