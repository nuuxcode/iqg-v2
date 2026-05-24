// @vitest-environment happy-dom
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/identity", () => ({ getOrCreateUserId: () => "test-id" }));
vi.mock("@/lib/storage", () => ({
  loadHistory: () => [],
  saveQuestionSet: vi.fn(),
  clearHistory: vi.fn(),
  getQuestionsForCombo: () => [],
  MAX_HISTORY: 50,
}));

const Page = (await import("@/app/page")).default;

describe("Page", () => {
  test("renders input, both selectors, generate button", () => {
    render(<Page />);
    expect(screen.getByPlaceholderText(/job title/i)).toBeTruthy();
    expect(screen.getByText(/Behavioral/i)).toBeTruthy();
    expect(screen.getByText(/Medium/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /generate/i })).toBeTruthy();
  });

  test("generate button is disabled when input is empty", () => {
    render(<Page />);
    const btn = screen.getByRole("button", { name: /generate/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
