import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CastawayCard from "./CastawayCard";
import { Castaway } from "@/types/castaway";

describe("CastawayCard", () => {
  const mockCastaway: Castaway = {
    id: "test-castaway-1",
    name: "Test Castaway",
    image: "https://example.com/castaway.jpg",
    bio: "A test castaway from previous seasons.",
    seasonNumber: 48,
    totalPoints: 0,
    eliminated: false,
    weeklyEvents: {},
  };

  it("should render castaway name", () => {
    render(<CastawayCard castaway={mockCastaway} />);
    expect(screen.getByText("Test Castaway")).toBeInTheDocument();
  });

  it("should render castaway image with correct alt text", () => {
    render(<CastawayCard castaway={mockCastaway} />);
    const image = screen.getByAltText("Test Castaway");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", mockCastaway.image);
  });

  it("should not render image when not provided", () => {
    const castawayWithoutImage: Castaway = {
      ...mockCastaway,
      image: undefined,
    };

    render(<CastawayCard castaway={castawayWithoutImage} />);
    const images = screen.queryAllByRole("img");
    expect(images).toHaveLength(0);
  });

  it("should not render eliminated styling even when isEliminated is true", () => {
    // isEliminated is kept in the prop signature but is intentionally a
    // visual no-op — eliminated castaways render as normal rarity-styled cards.
    render(<CastawayCard castaway={mockCastaway} isEliminated={true} />);
    expect(screen.queryByText("Eliminated")).not.toBeInTheDocument();
    expect(screen.queryByText(/Torch Snuffed/)).not.toBeInTheDocument();
  });

  it("should not render eliminated styling when isEliminated is false", () => {
    render(<CastawayCard castaway={mockCastaway} isEliminated={false} />);
    expect(screen.queryByText("Eliminated")).not.toBeInTheDocument();
    expect(screen.queryByText(/Torch Snuffed/)).not.toBeInTheDocument();
  });

  it("should display season score when provided", () => {
    render(<CastawayCard castaway={mockCastaway} seasonScore={150} />);
    expect(screen.getByText("150 pts this season")).toBeInTheDocument();
  });

  it("should not display season score chip when score is 0", () => {
    render(<CastawayCard castaway={mockCastaway} seasonScore={0} />);
    expect(screen.queryByText(/pts this season/)).not.toBeInTheDocument();
  });

  it("should display bio on the back of the card", () => {
    render(<CastawayCard castaway={mockCastaway} />);
    expect(
      screen.getByText("A test castaway from previous seasons."),
    ).toBeInTheDocument();
  });

  it("should show default message when bio is not provided", () => {
    const castawayWithoutBio: Castaway = {
      ...mockCastaway,
      bio: undefined,
    };

    render(<CastawayCard castaway={castawayWithoutBio} />);
    expect(
      screen.getByText("No previous season history available."),
    ).toBeInTheDocument();
  });

  it("should show 'Previous Seasons' header", () => {
    render(<CastawayCard castaway={mockCastaway} />);
    expect(screen.getByText("Previous Seasons")).toBeInTheDocument();
  });

  it("should handle all props together", () => {
    render(
      <CastawayCard
        castaway={mockCastaway}
        seasonScore={200}
        isEliminated={true}
      />,
    );

    expect(screen.getByText("Test Castaway")).toBeInTheDocument();
    expect(screen.queryByText("Eliminated")).not.toBeInTheDocument();
    expect(screen.getByText("200 pts this season")).toBeInTheDocument();
    expect(
      screen.getByText("A test castaway from previous seasons."),
    ).toBeInTheDocument();
  });

  it("should render with minimal props", () => {
    const minimalCastaway: Castaway = {
      id: "minimal",
      name: "Minimal Castaway",
      totalPoints: 0,
      eliminated: false,
      weeklyEvents: {},
    };

    render(<CastawayCard castaway={minimalCastaway} />);
    expect(screen.getByText("Minimal Castaway")).toBeInTheDocument();
    expect(
      screen.getByText("No previous season history available."),
    ).toBeInTheDocument();
  });
});
