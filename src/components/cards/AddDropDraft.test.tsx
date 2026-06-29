import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AddDropDraft from "./AddDropDraft";
import type { Castaway } from "@/types/castaway";
import type { TribeMember } from "@/types/league";

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

function setup(props: Partial<React.ComponentProps<typeof AddDropDraft>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const utils = render(
    <AddDropDraft
      open
      onClose={vi.fn()}
      onSubmit={onSubmit}
      tribeMember={member()}
      allCastaways={ALL}
      eliminatedCastawayIds={[]}
      seasonStartDate={new Date("2020-01-01")}
      addDropRestrictionEnabled={false}
      {...props}
    />,
  );
  const { container } = utils;
  return {
    onSubmit,
    container,
    tribe: () => Array.from(container.querySelectorAll<HTMLElement>(".sfl-swap-tribegrid .sfl-tcg")),
    avail: () => Array.from(container.querySelectorAll<HTMLElement>(".sfl-swap-availgrid .sfl-tcg")),
    dropPile: () => container.querySelector(".sfl-pack-discard .sfl-tcg"),
    confirm: () => screen.getByRole("button", { name: /Confirm Move/ }),
  };
}

describe("AddDropDraft", () => {
  it("renders the 5-card tribe and the available pool", () => {
    const s = setup();
    expect(s.tribe()).toHaveLength(5);
    expect(s.avail()).toHaveLength(5); // c5..c9
  });

  it("does not render when closed", () => {
    const { container } = render(
      <AddDropDraft
        open={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        tribeMember={member()}
        allCastaways={ALL}
        eliminatedCastawayIds={[]}
        seasonStartDate={new Date("2020-01-01")}
        addDropRestrictionEnabled={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("Confirm is disabled until a move is staged", () => {
    const s = setup();
    expect(s.confirm()).toBeDisabled();
  });

  it("tapping a tribe card opens the flip detail (does not drop)", () => {
    const s = setup();
    fireEvent.click(s.tribe()[0]);
    expect(screen.getByLabelText(/Flip card to see season stats/)).toBeInTheDocument();
    expect(s.dropPile()).toBeNull();
  });

  it("drop + add via the detail sheet enables Confirm and submits the right ids", () => {
    const s = setup();
    fireEvent.click(s.tribe()[0]); // open c0 detail
    fireEvent.click(screen.getByRole("button", { name: /Drop this castaway/ }));
    expect(screen.getByText("DROP")).toBeInTheDocument();
    fireEvent.click(s.avail()[0]); // open c5 detail
    fireEvent.click(screen.getByRole("button", { name: /Add to tribe/ }));
    expect(screen.getByText("ADD")).toBeInTheDocument();
    expect(s.confirm()).toBeEnabled();
    fireEvent.click(s.confirm());
    expect(s.onSubmit).toHaveBeenCalledWith("c0", "c5");
  });

  it("an eliminated tribe castaway cannot be dropped from its detail", () => {
    const s = setup({ eliminatedCastawayIds: ["c1"] });
    fireEvent.click(s.tribe()[1]); // c1 is eliminated
    expect(screen.queryByRole("button", { name: /Drop this castaway/ })).toBeNull();
    expect(screen.getByRole("button", { name: /can.t be dropped/i })).toBeDisabled();
  });

  it("offers Reset to last week only when the roster differs from the locked one", () => {
    // current roster equals the locked roster → reset disabled
    setup({
      tribeMember: member({
        weeklyRosters: [{ week: 2, castawayIds: ["c0", "c1", "c2", "c3", "c4"], weekScore: 0, lockedAt: new Date() }],
      }),
    });
    expect(screen.getByRole("button", { name: /Reset to last week/ })).toBeDisabled();
  });
});
