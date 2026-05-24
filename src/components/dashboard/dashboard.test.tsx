import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashHero from "./DashHero";
import StatStrip from "./StatStrip";
import PowerMovers from "./PowerMovers";
import NextEpisodeTile from "./NextEpisodeTile";
import LeagueChatMini from "./LeagueChatMini";
import type { Season } from "@/data/seasons";

const future: Season = {
  number: 51,
  name: "Survivor 51",
  theme: "A new era",
  premiereDate: new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  )
    .toISOString()
    .slice(0, 10),
  isActive: false,
};

describe("DashHero", () => {
  it("renders pre-season copy with premiere countdown", () => {
    render(
      <DashHero
        mode="pre-season"
        season={future}
        primaryAction={{ label: "Set lineup", href: "#" }}
      />,
    );
    expect(screen.getByText(/Pre-season/)).toBeInTheDocument();
    expect(screen.getByText("Survivor")).toBeInTheDocument();
    // The H1 splits the trailing word ("51") into an <em>; both render.
    expect(screen.getByText("51")).toBeInTheDocument();
    expect(screen.getByText("Set lineup")).toBeInTheDocument();
  });

  it("renders in-season hero with week kicker + lede", () => {
    render(
      <DashHero
        mode="in-season"
        weekKicker="Week 05 · Merge episode"
        episodeTitle="Live Together, Die Solo"
        lede={<>Locks at <b>Wednesday 8:00 PM ET</b>.</>}
        primaryAction={{ label: "Set lineup", href: "#" }}
        totalMembers={142}
        eliminations={{ eliminated: 7, total: 24 }}
      />,
    );
    expect(screen.getByText("Week 05 · Merge episode")).toBeInTheDocument();
    expect(screen.getByText("Solo")).toBeInTheDocument();
    expect(screen.getByText("142")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});

describe("StatStrip", () => {
  it("renders one cell per entry with label and sub", () => {
    render(
      <StatStrip
        cells={[
          { value: <span>#1</span>, label: "Rank", sub: "of 8" },
          { value: <span>188</span>, label: "Points" },
        ]}
      />,
    );
    expect(screen.getByText("Rank")).toBeInTheDocument();
    expect(screen.getByText("of 8")).toBeInTheDocument();
    expect(screen.getByText("Points")).toBeInTheDocument();
  });
});

describe("PowerMovers", () => {
  it("shows the empty-state message when no movers", () => {
    render(<PowerMovers movers={[]} />);
    expect(
      screen.getByText(/No movers yet/),
    ).toBeInTheDocument();
  });

  it("highlights the self user with the YOU tag", () => {
    render(
      <PowerMovers
        movers={[
          {
            userId: "me",
            displayName: "Me",
            color: "#000",
            initials: "ME",
            weekDelta: 10,
            totalPoints: 50,
            rank: 1,
          },
          {
            userId: "other",
            displayName: "Other",
            color: "#000",
            initials: "OT",
            weekDelta: 8,
            totalPoints: 40,
            rank: 2,
          },
        ]}
        selfUserId="me"
      />,
    );
    expect(screen.getByText("YOU")).toBeInTheDocument();
  });
});

describe("LeagueChatMini", () => {
  it("renders the empty state when no messages", () => {
    render(<LeagueChatMini leagueName="Quiet" messages={[]} />);
    expect(screen.getByText(/No messages yet/)).toBeInTheDocument();
  });

  it("limits the feed to 3 messages", () => {
    const msgs = Array.from({ length: 6 }).map((_, i) => ({
      id: `m${i}`,
      authorName: `Author ${i}`,
      authorInitials: "A",
      body: `Body ${i}`,
      time: "1m ago",
    }));
    render(<LeagueChatMini leagueName="L" messages={msgs} />);
    expect(screen.getByText("Body 0")).toBeInTheDocument();
    expect(screen.getByText("Body 2")).toBeInTheDocument();
    expect(screen.queryByText("Body 3")).toBeNull();
  });
});

describe("NextEpisodeTile", () => {
  it("renders title, when, stats, and CTA", () => {
    render(
      <NextEpisodeTile
        title="EP 5 · Merge"
        when="Wed 8pm ET"
        stats={[{ label: "Left", value: "17" }]}
        cta={{ label: "Episode log", href: "#" }}
      />,
    );
    expect(screen.getByText("EP 5 · Merge")).toBeInTheDocument();
    expect(screen.getByText("Wed 8pm ET")).toBeInTheDocument();
    expect(screen.getByText("Left")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("Episode log")).toBeInTheDocument();
  });
});
