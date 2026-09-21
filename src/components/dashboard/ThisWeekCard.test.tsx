import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ThisWeekCard from "./ThisWeekCard";
import type { Castaway } from "@/types/castaway";

const cast = (i: number, over: Partial<Castaway> = {}): Castaway => ({
  id: `c${i}`,
  name: `First${i} Last${i}`,
  totalPoints: 10 + i,
  eliminated: false,
  weeklyEvents: {},
  ...over,
});

function setup(props: Partial<React.ComponentProps<typeof ThisWeekCard>> = {}) {
  const onSwap = vi.fn();
  const onDraft = vi.fn();
  const utils = render(
    <ThisWeekCard
      rank={3}
      totalMembers={8}
      totalPoints={142}
      weekDelta={12}
      roster={[cast(0), cast(1), cast(2), cast(3), cast(4)]}
      eliminatedIds={new Set()}
      swapsLeft={1}
      onSwap={onSwap}
      onDraft={onDraft}
      {...props}
    />,
  );
  return { onSwap, onDraft, ...utils };
}

describe("ThisWeekCard", () => {
  it("leads with rank, points and roster health", () => {
    setup();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("of 8 tribes")).toBeInTheDocument();
    expect(screen.getByText("142")).toBeInTheDocument();
    expect(screen.getByText("+12 this week")).toBeInTheDocument();
    expect(screen.getByText("5/5")).toBeInTheDocument();
  });

  it("counts eliminated castaways out of the active total", () => {
    setup({ eliminatedIds: new Set(["c1", "c2"]) });
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("shows the swap CTA and fires it", () => {
    const s = setup();
    const cta = screen.getByRole("button", { name: /Make my weekly swap/ });
    cta.click();
    expect(s.onSwap).toHaveBeenCalled();
  });

  it("reframes the CTA once the week's swaps are used", () => {
    setup({ swapsLeft: 0 });
    expect(screen.getByRole("button", { name: /Review my move/ })).toBeInTheDocument();
    expect(screen.getByText(/No swaps left this week/)).toBeInTheDocument();
  });

  it("advertises both swaps pre-merge", () => {
    setup({ swapsLeft: 2 });
    expect(
      screen.getByRole("button", { name: /Make my swaps · 2 left/ }),
    ).toBeInTheDocument();
  });

  it("keeps the plain CTA when the league doesn't restrict swaps", () => {
    setup({ swapsLeft: null });
    expect(
      screen.getByRole("button", { name: /Make my weekly swap/ }),
    ).toBeInTheDocument();
  });

  it("shows the pack CTA instead when the tribe hasn't drafted", () => {
    const s = setup({ needsDraft: true, roster: [] });
    const cta = screen.getByRole("button", { name: /Open my pack/ });
    cta.click();
    expect(s.onDraft).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /weekly swap/ })).toBeNull();
  });

  it("renders open slots for an under-full tribe", () => {
    const { container } = setup({ roster: [cast(0), cast(1)] });
    expect(container.querySelectorAll(".sfl-thisweek-face.is-gap")).toHaveLength(3);
  });

  it("shows first names only, so five fit across a phone", () => {
    setup();
    expect(screen.getByText("First0")).toBeInTheDocument();
    expect(screen.queryByText("First0 Last0")).toBeNull();
  });

  it("omits the week delta when nothing was scored", () => {
    setup({ weekDelta: 0 });
    expect(screen.queryByText(/this week/)).toBeNull();
  });

  it("shows a placeholder rank before the first scoring", () => {
    setup({ rank: null });
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
