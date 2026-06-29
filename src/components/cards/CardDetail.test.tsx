import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CardDetail from "./CardDetail";
import type { Castaway } from "@/types/castaway";

const cirie: Castaway = {
  id: "cirie",
  name: "Cirie Fields",
  totalPoints: 42,
  eliminated: false,
  weeklyEvents: {},
  tribe: "mavu",
};

describe("CardDetail", () => {
  it("renders the dossier and a flip control", () => {
    render(<CardDetail castaway={cirie} vibe="Mastermind" onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Cirie Fields" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Flip card to see season stats/)).toHaveAttribute("aria-pressed", "false");
  });

  it("flips when the card is tapped", () => {
    render(<CardDetail castaway={cirie} onClose={vi.fn()} />);
    const flip = screen.getByLabelText(/Flip card to see season stats/);
    fireEvent.click(flip);
    expect(screen.getByLabelText(/Show card front/)).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the season-event breakdown on the back face", () => {
    render(
      <CardDetail
        castaway={cirie}
        events={[
          { label: "Immunity Win", points: 5 },
          { label: "Voted Out", points: -10 },
        ]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Immunity Win")).toBeInTheDocument();
    expect(screen.getByText("Voted Out")).toBeInTheDocument();
  });

  it("fires onClose from the dismiss button", () => {
    const onClose = vi.fn();
    render(<CardDetail castaway={cirie} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
