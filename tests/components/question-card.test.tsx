// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionCard } from "@/components/question-card";

describe("QuestionCard", () => {
  test("renders question text + index", () => {
    render(<QuestionCard index={1} text="What is REST?" />);
    expect(screen.getByText(/Q1/)).toBeTruthy();
    expect(screen.getByText(/What is REST/)).toBeTruthy();
  });

  test("renders streaming state with pulse class", () => {
    const { container } = render(<QuestionCard index={2} text="partial" streaming />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });
});
