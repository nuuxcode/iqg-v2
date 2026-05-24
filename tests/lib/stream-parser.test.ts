import { describe, expect, test } from "vitest";
import { extractQuestions } from "@/lib/stream-parser";

describe("extractQuestions", () => {
  test("returns 3 strings from complete object", () => {
    expect(extractQuestions({ questions: ["a", "b", "c"] })).toEqual(["a", "b", "c"]);
  });

  test("returns whatever questions exist mid-stream", () => {
    expect(extractQuestions({ questions: ["a"] })).toEqual(["a"]);
    expect(extractQuestions({ questions: ["a", "b"] })).toEqual(["a", "b"]);
  });

  test("returns [] for empty/missing", () => {
    expect(extractQuestions({})).toEqual([]);
    expect(extractQuestions({ questions: [] })).toEqual([]);
    expect(extractQuestions(undefined)).toEqual([]);
  });

  test("filters non-strings", () => {
    expect(extractQuestions({ questions: ["a", null, "b"] })).toEqual(["a", "b"]);
  });
});
