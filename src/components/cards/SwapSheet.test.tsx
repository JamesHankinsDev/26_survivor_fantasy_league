import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SwapSheet from "./SwapSheet";
import type { Castaway } from "@/types/castaway";
import type { TribeMember } from "@/types/league";
import type { RosterRules } from "@/utils/rosterRules";

/** Legacy single-swap rules, matching pre-S51 behaviour. */
const LEGACY: RosterRules = {
  swapsPerWeek: 1,
  canDropEliminated: false,
  isPostMerge: false,
};

const cast = (i: number, over = {}): Castaway => ({
  id: `c${i}`,
  name: `Cast ${i}`,
  totalPoints: 10 + i,
  eliminated: false,
  weeklyEvents: {},
  ...over,
});
const ALL = Array.from({ length: 10 }, (_, i) => cast(i));

const member = (over: Partial<TribeMember> = {}): TribeMember => ({
  userId: "u",
  displayName: "Tribe",
  avatar: "",
  tribeColor: "#E76F3C",
  totalPoints: 0,
  joinedAt: new Date(),
  roster: ["c0", "c1", "c2", "c3", "c4"],
  weeklyRosters: [],
  ...over,
});

function setup(props: Partial<React.ComponentProps<typeof SwapSheet>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const utils = render(
    <SwapSheet
      open
      onClose={onClose}
      onSubmit={onSubmit}
      tribeMember={member()}
      allCastaways={ALL}
      eliminatedCastawayIds={[]}
      seasonStartDate={new Date("2020-01-01")}
      addDropRestrictionEnabled={false}
      rules={LEGACY}
      {...props}
    />,
  );
  const { container } = utils;
  const rows = () => Array.from(container.querySelectorAll<HTMLElement>(".sfl-row"));
  return {
    onSubmit,
    onClose,
    container,
    rows,
    /** The row whose name cell reads `Cast {i}`. */
    row: (i: number) =>
      rows().find((r) => within(r).queryByText(`Cast ${i}`)) as HTMLElement,
    confirm: () => screen.getByRole("button", { name: /Confirm swap|Pick a swap above/ }),
  };
}

describe("SwapSheet", () => {
  it("renders the tribe as five rows", () => {
    const s = setup();
    expect(s.rows()).toHaveLength(5);
    expect(screen.getByText("Cast 0")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <SwapSheet
        open={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        tribeMember={member()}
        allCastaways={ALL}
        eliminatedCastawayIds={[]}
        seasonStartDate={new Date("2020-01-01")}
        addDropRestrictionEnabled={false}
        rules={LEGACY}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("Confirm is disabled until a swap is staged", () => {
    const s = setup();
    expect(s.confirm()).toBeDisabled();
    expect(s.confirm()).toHaveTextContent("Pick a swap above");
  });

  it("completes a swap in three taps and submits the right ids", () => {
    const s = setup();
    // 1. Swap out c0
    fireEvent.click(within(s.row(0)).getByRole("button", { name: "Swap" }));
    expect(screen.getByText(/Swapping out Cast 0/)).toBeInTheDocument();
    // 2. Pick a replacement from the available pool
    const pick = s.rows().find((r) => within(r).queryByText("Cast 9"))!;
    fireEvent.click(within(pick).getByRole("button", { name: "Add" }));
    // 3. Confirm
    expect(screen.getByText("Cast 0")).toBeInTheDocument(); // staged "Out" banner
    expect(s.confirm()).toBeEnabled();
    fireEvent.click(s.confirm());
    expect(s.onSubmit).toHaveBeenCalledWith("c0", "c9");
  });

  it("tapping the row body opens the card rather than performing the swap", () => {
    const s = setup();
    fireEvent.click(within(s.row(0)).getByRole("button", { name: /View card/ }));
    expect(screen.getByLabelText(/Flip card to see season stats/)).toBeInTheDocument();
    expect(screen.queryByText(/Swapping out/)).toBeNull();
  });

  it("Undo clears a staged swap", () => {
    const s = setup();
    fireEvent.click(within(s.row(0)).getByRole("button", { name: "Swap" }));
    const pick = s.rows().find((r) => within(r).queryByText("Cast 9"))!;
    fireEvent.click(within(pick).getByRole("button", { name: "Add" }));
    expect(s.confirm()).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(s.confirm()).toBeDisabled();
  });

  it("an eliminated castaway cannot be swapped out", () => {
    const s = setup({ eliminatedCastawayIds: ["c1"] });
    const row = s.row(1);
    expect(within(row).getByRole("button", { name: "Swap" })).toBeDisabled();
    expect(within(row).getByText(/Voted out/)).toBeInTheDocument();
  });

  it("under the one-change restriction only the newly added castaway is swappable", () => {
    const s = setup({
      addDropRestrictionEnabled: true,
      tribeMember: member({
        roster: ["c0", "c1", "c2", "c3", "c9"], // c9 added this week
        weeklyRosters: [
          {
            week: 2,
            castawayIds: ["c0", "c1", "c2", "c3", "c4"],
            weekScore: 0,
            lockedAt: new Date(),
          },
        ],
      }),
    });
    expect(within(s.row(9)).getByRole("button", { name: "Swap" })).toBeEnabled();
    expect(within(s.row(0)).getByRole("button", { name: "Swap" })).toBeDisabled();
    expect(within(s.row(0)).getByText("No swaps left this week")).toBeInTheDocument();
  });

  // ── S51 merge rules ──

  const PRE_MERGE: RosterRules = {
    swapsPerWeek: 2,
    canDropEliminated: true,
    isPostMerge: false,
  };
  const POST_MERGE: RosterRules = {
    swapsPerWeek: 1,
    canDropEliminated: false,
    isPostMerge: true,
  };

  const lockedLastWeek = (roster: string[]) =>
    member({
      roster,
      weeklyRosters: [
        {
          week: 2,
          castawayIds: ["c0", "c1", "c2", "c3", "c4"],
          weekScore: 0,
          lockedAt: new Date(),
        },
      ],
    });

  it("pre-merge: a voted-out castaway can be dropped to free the slot", () => {
    const s = setup({ rules: PRE_MERGE, eliminatedCastawayIds: ["c1"] });
    const row = s.row(1);
    expect(within(row).getByRole("button", { name: "Swap" })).toBeEnabled();
    expect(within(row).getByText(/drop to free the slot/)).toBeInTheDocument();
  });

  it("post-merge: a voted-out castaway can't be swapped out", () => {
    const s = setup({ rules: POST_MERGE, eliminatedCastawayIds: ["c1"] });
    const row = s.row(1);
    expect(within(row).getByRole("button", { name: "Swap" })).toBeDisabled();
    expect(within(row).getByText(/can’t be replaced after the merge/)).toBeInTheDocument();
  });

  it("pre-merge: a second swap is still allowed after the first", () => {
    const s = setup({
      rules: PRE_MERGE,
      addDropRestrictionEnabled: true,
      tribeMember: lockedLastWeek(["c0", "c1", "c2", "c3", "c9"]), // 1 of 2 used
    });
    // An untouched castaway is still swappable — the allowance isn't spent.
    expect(within(s.row(0)).getByRole("button", { name: "Swap" })).toBeEnabled();
    expect(
      s.container.querySelector(".sfl-swapsheet-title")?.textContent,
    ).toBe("1 swap left this week");
  });

  it("pre-merge: both swaps spent locks the rest of the tribe", () => {
    const s = setup({
      rules: PRE_MERGE,
      addDropRestrictionEnabled: true,
      tribeMember: lockedLastWeek(["c0", "c1", "c2", "c8", "c9"]), // 2 of 2 used
    });
    expect(within(s.row(0)).getByRole("button", { name: "Swap" })).toBeDisabled();
    expect(within(s.row(9)).getByRole("button", { name: "Swap" })).toBeEnabled();
    expect(
      s.container.querySelector(".sfl-swapsheet-title")?.textContent,
    ).toBe("No swaps left this week");
  });

  it("post-merge: one swap spent locks the rest of the tribe", () => {
    const s = setup({
      rules: POST_MERGE,
      addDropRestrictionEnabled: true,
      tribeMember: lockedLastWeek(["c0", "c1", "c2", "c3", "c9"]), // 1 of 1 used
    });
    expect(within(s.row(0)).getByRole("button", { name: "Swap" })).toBeDisabled();
    expect(within(s.row(9)).getByRole("button", { name: "Swap" })).toBeEnabled();
  });

  it("announces the remaining allowance in the header", () => {
    const s = setup({ rules: PRE_MERGE, addDropRestrictionEnabled: true });
    expect(
      s.container.querySelector(".sfl-swapsheet-title")?.textContent,
    ).toBe("2 swaps left this week");
  });

  it("offers an Add row for an under-full tribe and submits an add with no drop", () => {
    const s = setup({ tribeMember: member({ roster: ["c0", "c1"] }) });
    const empty = s.container.querySelectorAll(".sfl-row.is-empty");
    expect(empty).toHaveLength(3);
    fireEvent.click(within(empty[0] as HTMLElement).getByRole("button", { name: "Add" }));
    const pick = s.rows().find((r) => within(r).queryByText("Cast 9"))!;
    fireEvent.click(within(pick).getByRole("button", { name: "Add" }));
    fireEvent.click(s.confirm());
    expect(s.onSubmit).toHaveBeenCalledWith(null, "c9");
  });

  it("filters the replacement pool by search", () => {
    const s = setup();
    fireEvent.click(within(s.row(0)).getByRole("button", { name: "Swap" }));
    fireEvent.change(screen.getByLabelText("Search castaways"), {
      target: { value: "Cast 7" },
    });
    expect(screen.getByText("Cast 7")).toBeInTheDocument();
    expect(screen.queryByText("Cast 9")).toBeNull();
  });

  it("shows Reset to last week only when the roster differs from the locked one", () => {
    setup({
      tribeMember: member({
        weeklyRosters: [
          {
            week: 2,
            castawayIds: ["c0", "c1", "c2", "c3", "c4"],
            weekScore: 0,
            lockedAt: new Date(),
          },
        ],
      }),
    });
    expect(screen.queryByRole("button", { name: /Reset to last week/ })).toBeNull();
  });

  it("submits the reset sentinel when the roster drifted from the locked one", () => {
    const s = setup({
      tribeMember: member({
        roster: ["c0", "c1", "c2", "c3", "c9"],
        weeklyRosters: [
          {
            week: 2,
            castawayIds: ["c0", "c1", "c2", "c3", "c4"],
            weekScore: 0,
            lockedAt: new Date(),
          },
        ],
      }),
    });
    fireEvent.click(screen.getByRole("button", { name: /Reset to last week/ }));
    expect(s.onSubmit).toHaveBeenCalledWith("__RESET_TO_PRIOR_WEEK__", null);
  });
});
