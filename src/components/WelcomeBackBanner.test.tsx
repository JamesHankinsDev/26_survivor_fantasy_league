import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WelcomeBackBanner from "./WelcomeBackBanner";

function setup(displayName = "James Hankins") {
  const onStart = vi.fn();
  const onDismiss = vi.fn();
  render(
    <WelcomeBackBanner
      displayName={displayName}
      onStart={onStart}
      onDismiss={onDismiss}
    />,
  );
  return { onStart, onDismiss };
}

describe("WelcomeBackBanner", () => {
  it("greets by first name only", () => {
    setup("James Hankins");
    expect(screen.getByText(/Hey James/)).toBeInTheDocument();
    expect(screen.queryByText(/Hankins/)).toBeNull();
  });

  it("falls back gracefully when the name is an email", () => {
    setup("hankins.jamesb@gmail.com");
    expect(screen.getByText(/Hey hankins.jamesb/)).toBeInTheDocument();
  });

  it("falls back to 'there' for an empty name", () => {
    setup("   ");
    expect(screen.getByText(/Hey there/)).toBeInTheDocument();
  });

  it("starts the walkthrough from the primary action", () => {
    const s = setup();
    fireEvent.click(screen.getByRole("button", { name: /Show me how to play/ }));
    expect(s.onStart).toHaveBeenCalledTimes(1);
    expect(s.onDismiss).not.toHaveBeenCalled();
  });

  it("dismisses from the secondary action", () => {
    const s = setup();
    fireEvent.click(screen.getByRole("button", { name: "No thanks" }));
    expect(s.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses from the close affordance", () => {
    const s = setup();
    fireEvent.click(screen.getByRole("button", { name: /Dismiss welcome message/ }));
    expect(s.onDismiss).toHaveBeenCalledTimes(1);
  });
});
