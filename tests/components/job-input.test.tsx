// @vitest-environment happy-dom
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JobInput } from "@/components/job-input";

describe("JobInput", () => {
  test("renders with placeholder", () => {
    render(<JobInput value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/job title/i)).toBeTruthy();
  });

  test("calls onChange with new value", () => {
    const onChange = vi.fn();
    render(<JobInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Engineer" } });
    expect(onChange).toHaveBeenCalledWith("Engineer");
  });

  test("respects disabled", () => {
    render(<JobInput value="x" onChange={() => {}} disabled />);
    expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(true);
  });

  test("enforces 100 char maxLength", () => {
    render(<JobInput value="" onChange={() => {}} />);
    expect((screen.getByRole("textbox") as HTMLInputElement).maxLength).toBe(100);
  });
});
