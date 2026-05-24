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

  test("save merges into top entry when role+type+difficulty match (3 more flow)", () => {
    saveQuestionSet({ role: "Software Engineer", type: "behavioral", difficulty: "medium", questions: ["a","b","c"], generatedAt: 1 });
    saveQuestionSet({ role: "Software Engineer", type: "behavioral", difficulty: "medium", questions: ["a","b","c","d","e","f"], generatedAt: 2 });
    const h = loadHistory();
    expect(h).toHaveLength(1);
    expect(h[0].questions).toHaveLength(6);
  });

  test("save creates new entry when role differs", () => {
    saveQuestionSet({ role: "Software Engineer", type: "behavioral", difficulty: "medium", questions: ["a","b","c"], generatedAt: 1 });
    saveQuestionSet({ role: "Product Manager", type: "behavioral", difficulty: "medium", questions: ["x","y","z"], generatedAt: 2 });
    expect(loadHistory()).toHaveLength(2);
  });

  test("save creates new entry when difficulty differs even for same role", () => {
    saveQuestionSet({ role: "Software Engineer", type: "behavioral", difficulty: "medium", questions: ["a","b","c"], generatedAt: 1 });
    saveQuestionSet({ role: "Software Engineer", type: "behavioral", difficulty: "hard", questions: ["x","y","z"], generatedAt: 2 });
    expect(loadHistory()).toHaveLength(2);
  });
});
