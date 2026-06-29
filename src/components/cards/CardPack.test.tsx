import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CardPack from "./CardPack";
import type { Castaway } from "@/types/castaway";

const hand: Castaway[] = Array.from({ length: 7 }, (_, i) => ({
  id: `c${i}`,
  name: `Castaway ${i}`,
  totalPoints: 10 + i,
  eliminated: false,
  weeklyEvents: {},
}));

function setup(props: Partial<React.ComponentProps<typeof CardPack>> = {}) {
  const onLock = vi.fn();
  const utils = render(<CardPack open hand={hand} keepCount={5} onLock={onLock} {...props} />);
  return { onLock, ...utils };
}

async function open() {
  fireEvent.click(screen.getByText(/Tap to rip open/));
  await screen.findByRole("button", { name: /Lock My Tribe/ });
}

const lockBtn = () => screen.getByRole("button", { name: /Lock My Tribe/ });
const firstDrawCard = (c: HTMLElement) => c.querySelector<HTMLElement>(".sfl-pack-draw .sfl-tcg")!;

/** Tap the first draw card and confirm the discard from its detail sheet. */
function discardFirst(container: HTMLElement) {
  fireEvent.click(firstDrawCard(container));
  fireEvent.click(screen.getByRole("button", { name: /Discard this card/ }));
}

describe("CardPack", () => {
  it("renders sealed until ripped, then reveals the hand", async () => {
    setup();
    expect(screen.getByText("7 Castaways Inside")).toBeInTheDocument();
    await open();
    expect(screen.getByText(/Drag 2 cards to the discard pile/)).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    const { container } = setup({ open: false });
    expect(container.firstChild).toBeNull();
  });

  it("tapping a card opens the flip detail sheet (does not discard)", async () => {
    const { container } = setup();
    await open();
    fireEvent.click(firstDrawCard(container));
    // Detail sheet with the flip + a discard action.
    expect(screen.getByLabelText(/Flip card to see season stats/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Discard this card/ })).toBeInTheDocument();
    // Nothing discarded yet.
    expect(screen.queryByText("DISCARD")).toBeNull();
  });

  it("discarding from the detail sheet enables Lock after the required count", async () => {
    const { container } = setup();
    await open();
    expect(lockBtn()).toBeDisabled();
    discardFirst(container);
    expect(lockBtn()).toBeDisabled();
    discardFirst(container);
    expect(lockBtn()).toBeEnabled();
    expect(screen.getAllByText("DISCARD")).toHaveLength(2);
  });

  it("won't allow a third discard once the tribe is cut", async () => {
    const { container } = setup();
    await open();
    discardFirst(container);
    discardFirst(container);
    fireEvent.click(firstDrawCard(container)); // open a third card's detail
    expect(screen.queryByRole("button", { name: /Discard this card/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Tribe already cut/ })).toBeDisabled();
  });

  it("locks the kept five castaway ids", async () => {
    const { container, onLock } = setup();
    await open();
    discardFirst(container); // c0
    discardFirst(container); // c1
    fireEvent.click(lockBtn());
    expect(onLock).toHaveBeenCalledWith(["c2", "c3", "c4", "c5", "c6"]);
  });

  it("auto-enables Lock when there is nothing to discard (hand ≤ keep)", async () => {
    setup({ hand: hand.slice(0, 4) });
    await open();
    expect(lockBtn()).toBeEnabled();
  });
});
