// @vitest-environment happy-dom
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SelectorGroup } from "@/components/selector-group";

describe("SelectorGroup", () => {
  test("renders all options", () => {
    render(
      <SelectorGroup
        label="Type"
        value="behavioral"
        options={[
          { value: "behavioral", label: "Behavioral" },
          { value: "technical", label: "Technical" },
        ]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Behavioral")).toBeTruthy();
    expect(screen.getByText("Technical")).toBeTruthy();
  });

  test("calls onChange when clicked", () => {
    const onChange = vi.fn();
    render(
      <SelectorGroup
        label="Type"
        value="behavioral"
        options={[
          { value: "behavioral", label: "Behavioral" },
          { value: "technical", label: "Technical" },
        ]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Technical"));
    expect(onChange).toHaveBeenCalledWith("technical");
  });

  test("highlights selected option", () => {
    render(
      <SelectorGroup
        label="Type"
        value="technical"
        options={[
          { value: "behavioral", label: "Behavioral" },
          { value: "technical", label: "Technical" },
        ]}
        onChange={() => {}}
      />,
    );
    const techBtn = screen.getByText("Technical").closest("button")!;
    expect(techBtn.getAttribute("aria-pressed")).toBe("true");
  });
});
