import { describe, expect, test } from "vitest";
import { buildValidatorPrompt, buildMainPrompt, EXAMPLES } from "@/lib/prompts";

describe("prompts", () => {
  test("EXAMPLES contains 5 safe job titles", () => {
    expect(EXAMPLES).toHaveLength(5);
    expect(EXAMPLES).toContain("Software Engineer");
  });

  test("buildValidatorPrompt includes the input", () => {
    const p = buildValidatorPrompt("Data Scientist");
    expect(p).toContain("Data Scientist");
    expect(p).toContain("Reject");
  });

  test("buildMainPrompt includes role, type, difficulty", () => {
    const p = buildMainPrompt({
      role: "Senior Eng",
      type: "behavioral",
      difficulty: "hard",
      exclude: [],
    });
    expect(p).toContain("Senior Eng");
    expect(p).toContain("behavioral");
    expect(p).toContain("hard");
  });

  test("buildMainPrompt lists excludes", () => {
    const p = buildMainPrompt({
      role: "X",
      type: "technical",
      difficulty: "medium",
      exclude: ["Q1?", "Q2?"],
    });
    expect(p).toContain("Q1?");
    expect(p).toContain("Q2?");
    expect(p).toContain("do NOT repeat");
  });

  test("buildMainPrompt omits exclude section when empty", () => {
    const p = buildMainPrompt({
      role: "X",
      type: "technical",
      difficulty: "easy",
      exclude: [],
    });
    expect(p).not.toContain("do NOT repeat");
  });
});
