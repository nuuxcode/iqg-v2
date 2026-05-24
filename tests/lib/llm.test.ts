import { describe, expect, test, vi, beforeEach } from "vitest";

const generateTextMock = vi.fn();
const streamObjectMock = vi.fn();

vi.mock("ai", () => ({
  generateText: generateTextMock,
  streamObject: streamObjectMock,
}));

vi.mock("@ai-sdk/google", () => ({
  google: (m: string) => ({ modelId: m }),
}));

const { validate, generateWithFallback } = await import("@/lib/llm");

describe("validate", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    process.env.GEMINI_MODEL_VALIDATOR = "gemini-2.5-flash-lite";
  });

  test("returns valid for accepting input", async () => {
    generateTextMock.mockResolvedValue({ text: '{"valid": true}' });
    const r = await validate("Software Engineer");
    expect(r.valid).toBe(true);
  });

  test("returns invalid with reason", async () => {
    generateTextMock.mockResolvedValue({
      text: '{"valid": false, "reason": "not a job"}',
    });
    const r = await validate("asdf");
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("not a job");
  });

  test("returns invalid on malformed JSON", async () => {
    generateTextMock.mockResolvedValue({ text: "not json" });
    const r = await validate("anything");
    expect(r.valid).toBe(false);
  });
});

describe("generateWithFallback", () => {
  beforeEach(() => {
    streamObjectMock.mockReset();
    process.env.GEMINI_MODEL_MAIN = "gemini-2.5-pro";
    process.env.GEMINI_MODEL_BACKUP = "gemini-2.5-flash";
  });

  test("uses main model on success", () => {
    streamObjectMock.mockReturnValue({ object: Promise.resolve({ questions: ["a", "b", "c"] }) });
    generateWithFallback({ prompt: "p" });
    expect(streamObjectMock).toHaveBeenCalledTimes(1);
    expect(streamObjectMock.mock.calls[0][0].model.modelId).toBe("gemini-2.5-pro");
  });

  test("falls back to backup when main throws", () => {
    streamObjectMock
      .mockImplementationOnce(() => { throw new Error("main down"); })
      .mockReturnValue({ object: Promise.resolve({ questions: ["a", "b", "c"] }) });
    generateWithFallback({ prompt: "p" });
    expect(streamObjectMock).toHaveBeenCalledTimes(2);
    expect(streamObjectMock.mock.calls[1][0].model.modelId).toBe("gemini-2.5-flash");
  });

  test("uses backup directly when forceBackup is true", () => {
    streamObjectMock.mockReturnValue({ object: Promise.resolve({ questions: ["a", "b", "c"] }) });
    generateWithFallback({ prompt: "p", forceBackup: true });
    expect(streamObjectMock.mock.calls[0][0].model.modelId).toBe("gemini-2.5-flash");
  });
});
