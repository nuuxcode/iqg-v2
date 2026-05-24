// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBanner } from "@/components/error-banner";

describe("ErrorBanner", () => {
  test("renders the message", () => {
    render(<ErrorBanner kind="invalid" message="not a role" />);
    expect(screen.getByText(/not a role/)).toBeTruthy();
  });

  test("shows examples when provided", () => {
    render(<ErrorBanner kind="invalid" message="x" examples={["Software Engineer"]} />);
    expect(screen.getByText("Software Engineer")).toBeTruthy();
  });
});
