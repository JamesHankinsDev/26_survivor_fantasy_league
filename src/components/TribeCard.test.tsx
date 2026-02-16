import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TribeCard from "./TribeCard";
import { TribeMember } from "@/types/league";

describe("TribeCard", () => {
  const mockMember: TribeMember = {
    userId: "user1",
    displayName: "John Doe",
    avatar: "https://example.com/avatar.jpg",
    tribeColor: "#ff0000",
    points: 150,
    joinedAt: new Date(),
    roster: [
      {
        castawayId: "c1",
        status: "active",
        addedWeek: 0,
        accumulatedPoints: 50,
      },
      {
        castawayId: "c2",
        status: "active",
        addedWeek: 0,
        accumulatedPoints: 100,
      },
    ],
  };

  const mockAllMembers: TribeMember[] = [
    mockMember,
    {
      userId: "user2",
      displayName: "Jane Smith",
      avatar: "",
      tribeColor: "#00ff00",
      points: 200,
      joinedAt: new Date(),
      roster: [],
    },
  ];

  it("should render tribe member name", () => {
    render(
      <TribeCard
        member={mockMember}
        rank={1}
        allMembers={mockAllMembers}
      />,
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should display correct rank label", () => {
    render(
      <TribeCard
        member={mockMember}
        rank={1}
        allMembers={mockAllMembers}
      />,
    );

    expect(screen.getByText("1st")).toBeInTheDocument();
  });

  it("should display points", () => {
    render(
      <TribeCard
        member={mockMember}
        rank={1}
        allMembers={mockAllMembers}
      />,
    );

    expect(screen.getByText(/150/)).toBeInTheDocument();
  });

  it("should render avatar with correct src", () => {
    render(
      <TribeCard
        member={mockMember}
        rank={1}
        allMembers={mockAllMembers}
      />,
    );

    const avatar = screen.getByAltText("John Doe");
    expect(avatar).toBeInTheDocument();
  });

  it("should show different rank labels correctly", () => {
    const { rerender } = render(
      <TribeCard
        member={mockMember}
        rank={2}
        allMembers={mockAllMembers}
      />,
    );
    expect(screen.getByText("2nd")).toBeInTheDocument();

    rerender(
      <TribeCard
        member={mockMember}
        rank={3}
        allMembers={mockAllMembers}
      />,
    );
    expect(screen.getByText("3rd")).toBeInTheDocument();

    rerender(
      <TribeCard
        member={mockMember}
        rank={4}
        allMembers={mockAllMembers}
      />,
    );
    expect(screen.getByText("4th")).toBeInTheDocument();
  });

  it("should handle 11th, 12th, 13th correctly", () => {
    const { rerender } = render(
      <TribeCard
        member={mockMember}
        rank={11}
        allMembers={mockAllMembers}
      />,
    );
    expect(screen.getByText("11th")).toBeInTheDocument();

    rerender(
      <TribeCard
        member={mockMember}
        rank={12}
        allMembers={mockAllMembers}
      />,
    );
    expect(screen.getByText("12th")).toBeInTheDocument();

    rerender(
      <TribeCard
        member={mockMember}
        rank={13}
        allMembers={mockAllMembers}
      />,
    );
    expect(screen.getByText("13th")).toBeInTheDocument();
  });
});
