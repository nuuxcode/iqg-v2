import { describe, expect, test, vi, beforeEach } from "vitest";

process.env.RATELIMIT_SECRET = "test-secret-32-chars-1234567890abcd";
process.env.GEMINI_API_KEY = "test";
process.env.GEMINI_MODEL_VALIDATOR = "gemini-2.5-flash-lite";
process.env.GEMINI_MODEL_MAIN = "gemini-2.5-pro";
process.env.GEMINI_MODEL_BACKUP = "gemini-2.5-flash";

vi.mock("@/lib/llm", () => ({
  validate: vi.fn(),
  generateWithFallback: vi.fn(),
}));

const { POST } = await import("@/app/api/generate/route");
const llm = await import("@/lib/llm");

function makeReq(body: object, cookieHeader = ""): Request {
  return new Request("http://test/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader },
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.mocked(llm.validate).mockReset();
    vi.mocked(llm.generateWithFallback).mockReset();
  });

  test("400 on missing role", async () => {
    const r = await POST(makeReq({ type: "behavioral", difficulty: "easy" }));
    expect(r.status).toBe(400);
  });

  test("400 on too-long role (via Zod)", async () => {
    const r = await POST(
      makeReq({ role: "a".repeat(200), type: "behavioral", difficulty: "easy", exclude: [] }),
    );
    expect(r.status).toBe(400);
  });

  test("200 + invalid when validator rejects", async () => {
    vi.mocked(llm.validate).mockResolvedValue({ valid: false, reason: "not a job" });
    const r = await POST(
      makeReq({ role: "asdf", type: "behavioral", difficulty: "easy", exclude: [] }),
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.valid).toBe(false);
    expect(body.examples).toBeDefined();
  });

  test("skips validator when validated=true", async () => {
    vi.mocked(llm.generateWithFallback).mockReturnValue({
      toTextStreamResponse: () => new Response("stream", { status: 200 }),
    } as never);
    await POST(
      makeReq({
        role: "Software Engineer",
        type: "behavioral",
        difficulty: "easy",
        exclude: [],
        validated: true,
      }),
    );
    expect(llm.validate).not.toHaveBeenCalled();
    expect(llm.generateWithFallback).toHaveBeenCalled();
  });

  test("429 when rate limit exceeded", async () => {
    const { buildCookie } = await import("@/lib/rate-limit");
    const cookie = buildCookie({ count: 10, resetAt: Date.now() + 10000 });
    const r = await POST(
      makeReq(
        { role: "Software Engineer", type: "behavioral", difficulty: "easy", exclude: [] },
        `iqg_rl=${encodeURIComponent(cookie)}`,
      ),
    );
    expect(r.status).toBe(429);
  });
});
