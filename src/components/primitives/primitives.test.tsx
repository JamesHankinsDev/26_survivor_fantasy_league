import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  StatusPill,
  TribeChip,
  PointBadge,
  SectionHeader,
  Card,
} from "./index";

describe("StatusPill", () => {
  it("renders the default label for each status", () => {
    render(<StatusPill status="active" />);
    expect(screen.getByText("ON ROSTER")).toBeInTheDocument();
  });

  it("supports a custom label", () => {
    render(<StatusPill status="out" label="ELIMINATED" />);
    expect(screen.getByText("ELIMINATED")).toBeInTheDocument();
  });

  it("applies the status modifier class", () => {
    const { container } = render(<StatusPill status="jury" />);
    expect(container.querySelector(".sfl-pill.jury")).not.toBeNull();
  });
});

describe("TribeChip", () => {
  it("renders the resolved tribe name and glyph", () => {
    render(<TribeChip tribe="lakaya" />);
    expect(screen.getByText("Lakaya")).toBeInTheDocument();
    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  it("returns null for an unknown tribe id", () => {
    const { container } = render(<TribeChip tribe="nonexistent" />);
    expect(container.querySelector(".sfl-tribechip")).toBeNull();
  });
});

describe("PointBadge", () => {
  it("renders a positive value with a plus and pos tone", () => {
    const { container } = render(<PointBadge value={12} />);
    const badge = container.querySelector(".sfl-pts.pos") as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("+12");
  });

  it("renders a negative value with a minus and neg tone", () => {
    const { container } = render(<PointBadge value={-7} />);
    const badge = container.querySelector(".sfl-pts.neg") as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("−7");
  });

  it("renders zero as neu without a sign", () => {
    const { container } = render(<PointBadge value={0} />);
    const badge = container.querySelector(".sfl-pts.neu") as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("0");
  });

  it("appends the trend arrow", () => {
    render(<PointBadge value={5} trend="up" />);
    expect(screen.getByText("↑")).toBeInTheDocument();
  });
});

describe("SectionHeader", () => {
  it("renders title only when no eyebrow", () => {
    render(<SectionHeader title="Standings" />);
    expect(screen.getByText("Standings")).toBeInTheDocument();
  });

  it("renders eyebrow + title + action", () => {
    render(
      <SectionHeader
        eyebrow="WEEK 6"
        title="Top Movers"
        action={<button>See all</button>}
      />,
    );
    expect(screen.getByText("WEEK 6")).toBeInTheDocument();
    expect(screen.getByText("Top Movers")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /see all/i }),
    ).toBeInTheDocument();
  });
});

describe("Card", () => {
  it("applies the sfl-card class", () => {
    const { container } = render(<Card>content</Card>);
    expect(container.querySelector(".sfl-card")).not.toBeNull();
  });

  it("exposes an accent color as --accent", () => {
    const { container } = render(<Card accent="#ff0000">x</Card>);
    const card = container.querySelector(".sfl-card") as HTMLElement;
    expect(card.style.getPropertyValue("--accent")).toBe("#ff0000");
  });
});
