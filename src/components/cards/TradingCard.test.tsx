import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TradingCard from "./TradingCard";
import type { Castaway } from "@/types/castaway";

const makeCastaway = (overrides: Partial<Castaway> = {}): Castaway => ({
  id: "c-test",
  name: "Test Castaway",
  totalPoints: 0,
  eliminated: false,
  weeklyEvents: {},
  ...overrides,
});

describe("TradingCard — content", () => {
  it("renders the castaway name in uppercase and the point total", () => {
    render(<TradingCard castaway={makeCastaway({ name: "Ava Trujillo", totalPoints: 47 })} />);
    expect(screen.getByText("AVA TRUJILLO")).toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
  });

  it("renders the footer with `RARITY · CASTAWAY` by default", () => {
    const { container } = render(<TradingCard castaway={makeCastaway({ totalPoints: 40 })} />);
    expect(container.querySelector(".sfl-tcg-rarity")?.textContent).toBe("LEGENDARY");
    expect(container.querySelector(".sfl-tcg-vibe")?.textContent).toBe("CASTAWAY");
  });

  it("uses a custom vibe prop when provided", () => {
    const { container } = render(
      <TradingCard castaway={makeCastaway()} vibe="strategist" />,
    );
    expect(container.querySelector(".sfl-tcg-vibe")?.textContent).toBe("STRATEGIST");
  });
});

describe("TradingCard — rarity classes", () => {
  it.each([
    [0, "rarity-common"],
    [20, "rarity-rare"],
    [30, "rarity-epic"],
    [40, "rarity-legendary"],
    [60, "rarity-mythic"],
  ])("applies %s for %i points", (points, expectedClass) => {
    const { container } = render(
      <TradingCard castaway={makeCastaway({ totalPoints: points as number })} />,
    );
    expect(container.querySelector(`.sfl-tcg.${expectedClass}`)).not.toBeNull();
  });
});

describe("TradingCard — states", () => {
  it("shows the VOTED OUT stamp when eliminated", () => {
    render(<TradingCard castaway={makeCastaway({ eliminated: true })} />);
    expect(screen.getByText("VOTED OUT")).toBeInTheDocument();
  });

  it("shows the idol badge when inventory.immunity_idol > 0", () => {
    const c = makeCastaway({ inventory: { immunity_idol: 2 } });
    render(<TradingCard castaway={c} />);
    expect(screen.getByLabelText("2 idols")).toBeInTheDocument();
  });

  it("shows the tribe glyph mark when castaway has a known tribe", () => {
    const c = makeCastaway({ tribe: "lakaya" });
    render(<TradingCard castaway={c} />);
    expect(screen.getByLabelText("Tribe: Lakaya")).toBeInTheDocument();
  });

  it("renders the picked action tag", () => {
    render(<TradingCard castaway={makeCastaway()} picked />);
    expect(screen.getByText(/PICKED/)).toBeInTheDocument();
  });

  it("renders the dropping action tag", () => {
    render(<TradingCard castaway={makeCastaway()} dropping />);
    expect(screen.getByText(/DROPPING/)).toBeInTheDocument();
  });

  it("renders a ghost slot", () => {
    render(<TradingCard ghost />);
    expect(screen.getByLabelText("Empty roster slot")).toBeInTheDocument();
    expect(screen.getByText("Empty slot")).toBeInTheDocument();
  });
});

describe("TradingCard — interactivity", () => {
  it("renders as a button when onClick is provided and forwards the castaway", () => {
    const onClick = vi.fn();
    const c = makeCastaway({ totalPoints: 32 });
    render(<TradingCard castaway={c} onClick={onClick} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith(c);
  });

  it("activates on Enter / Space when focused", () => {
    const onClick = vi.fn();
    const c = makeCastaway();
    render(<TradingCard castaway={c} onClick={onClick} />);
    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("renders as a non-interactive role=img when no onClick", () => {
    render(<TradingCard castaway={makeCastaway()} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("includes name, rarity, and points in the aria-label", () => {
    render(
      <TradingCard
        castaway={makeCastaway({ name: "Ava", totalPoints: 50 })}
      />,
    );
    expect(
      screen.getByLabelText(/Ava, Mythic, 50 points/),
    ).toBeInTheDocument();
  });
});
