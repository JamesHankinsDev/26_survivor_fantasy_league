import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HowToPlayWalkthrough from "./HowToPlayWalkthrough";

function setup(props: Partial<React.ComponentProps<typeof HowToPlayWalkthrough>> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <HowToPlayWalkthrough open onClose={onClose} {...props} />,
  );
  return {
    onClose,
    ...utils,
    next: () => screen.getByRole("button", { name: "Next" }),
    back: () => screen.getByRole("button", { name: "Back" }),
    skip: () => screen.getByRole("button", { name: /Skip|Close/ }),
  };
}

/** Click Next until the final slide. */
function advanceToEnd() {
  for (let i = 0; i < 20; i++) {
    const next = screen.queryByRole("button", { name: "Next" });
    if (!next) return;
    fireEvent.click(next);
  }
  throw new Error("never reached the last slide");
}

describe("HowToPlayWalkthrough", () => {
  it("does not render when closed", () => {
    const { container } = render(
      <HowToPlayWalkthrough open={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("opens on the welcome slide", () => {
    setup();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText(/how the game works/i)).toBeInTheDocument();
  });

  it("walks forward and back through the slides", () => {
    const s = setup();
    expect(s.back()).toBeDisabled();
    fireEvent.click(s.next());
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    fireEvent.click(s.back());
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("teaches the whole loop: draft, score, swap, the roster rule", () => {
    const s = setup();
    const seen: string[] = [];
    for (let i = 0; i < 20; i++) {
      seen.push(document.querySelector(".sfl-wt-title")?.textContent ?? "");
      const next = screen.queryByRole("button", { name: "Next" });
      if (!next) break;
      fireEvent.click(next);
    }
    const all = seen.join(" | ");
    expect(all).toMatch(/pack/i);
    expect(all).toMatch(/score/i);
    expect(all).toMatch(/swap/i);
    expect(all).toMatch(/Points only count while they're yours/i);
    expect(all).toMatch(/merge/i);
    expect(s.onClose).not.toHaveBeenCalled();
  });

  it("states the Wednesday 8pm ET lock and the swap allowance", () => {
    const s = setup();
    fireEvent.click(s.next()); // Step 1 — pack
    fireEvent.click(s.next()); // Step 2 — scoring
    fireEvent.click(s.next()); // Step 3 — swapping
    expect(screen.getByText(/Wednesday at 8:00 PM ET/)).toBeInTheDocument();
    expect(screen.getByText(/two swaps a week before the merge/i)).toBeInTheDocument();
  });

  it("explains how the merge changes the roster rules", () => {
    const s = setup();
    for (let i = 0; i < 4; i++) fireEvent.click(s.next());
    expect(screen.getByText("The merge changes everything")).toBeInTheDocument();
    const body = document.querySelector(".sfl-wt-body")?.textContent ?? "";
    expect(body).toMatch(/stays on your roster/i);
    expect(body).toMatch(/surviving castaways/i);
    // Tone check: no mortuary imagery in player-facing copy.
    expect(body).not.toMatch(/corpse|carcass/i);
  });

  it("lists advantage scoring now that it actually pays", () => {
    const s = setup();
    fireEvent.click(s.next());
    fireEvent.click(s.next()); // scoring slide
    expect(screen.getByText("Found Advantage")).toBeInTheDocument();
  });

  it("closes from the final slide", () => {
    const s = setup();
    advanceToEnd();
    const done = screen.getByRole("button", { name: /Got it/ });
    fireEvent.click(done);
    expect(s.onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from Skip on any slide", () => {
    const s = setup();
    fireEvent.click(s.next());
    fireEvent.click(s.skip());
    expect(s.onClose).toHaveBeenCalledTimes(1);
  });

  it("restarts at the first slide when reopened", () => {
    const { rerender } = render(
      <HowToPlayWalkthrough open onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    rerender(<HowToPlayWalkthrough open={false} onClose={vi.fn()} />);
    rerender(<HowToPlayWalkthrough open onClose={vi.fn()} />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("warns that progress won't stick when not running in production", () => {
    setup({ persists: false });
    expect(screen.getByText(/won't be marked as seen/i)).toBeInTheDocument();
  });

  it("stays quiet about persistence in production", () => {
    setup({ persists: true });
    expect(screen.queryByText(/won't be marked as seen/i)).toBeNull();
  });

  it("shows real point values rather than invented ones", () => {
    const s = setup();
    fireEvent.click(s.next()); // Step 1
    fireEvent.click(s.next()); // Step 2 — scoring
    const rows = document.querySelectorAll(".sfl-wt-scores li");
    expect(rows.length).toBeGreaterThan(3);
    // Season winner is the headline value and must be positive.
    expect(screen.getByText("Season Winner")).toBeInTheDocument();
    // No zero-valued events should be listed.
    for (const row of rows) {
      expect(row.querySelector("b")?.textContent).not.toBe("+0");
    }
  });
});
