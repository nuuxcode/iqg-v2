// @vitest-environment happy-dom
import { describe, expect, test, beforeEach } from "vitest";
import { saveQuestionSet, loadHistory, clearHistory, MAX_HISTORY } from "@/lib/storage";

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  test("saveQuestionSet + loadHistory round-trips", () => {
    saveQuestionSet({
      role: "Eng",
      type: "behavioral",
      difficulty: "easy",
      questions: ["a", "b", "c"],
      generatedAt: 1,
    });
    expect(loadHistory()).toHaveLength(1);
  });

  test("loadHistory returns most recent first", () => {
    saveQuestionSet({ role: "A", type: "behavioral", difficulty: "easy", questions: ["1","2","3"], generatedAt: 1 });
    saveQuestionSet({ role: "B", type: "behavioral", difficulty: "easy", questions: ["1","2","3"], generatedAt: 2 });
    expect(loadHistory()[0].role).toBe("B");
  });

  test("caps at MAX_HISTORY", () => {
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      saveQuestionSet({ role: `r${i}`, type: "behavioral", difficulty: "easy", questions: ["1","2","3"], generatedAt: i });
    }
    expect(loadHistory()).toHaveLength(MAX_HISTORY);
  });

  test("clearHistory empties storage", () => {
    saveQuestionSet({ role: "A", type: "behavioral", difficulty: "easy", questions: ["1","2","3"], generatedAt: 1 });
    clearHistory();
    expect(loadHistory()).toHaveLength(0);
  });
});
