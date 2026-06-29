import { describe, it, expect } from "vitest";
import { castawayEventBreakdown } from "./castawayEvents";
import type { Castaway } from "@/types/castaway";

const make = (weeklyEvents: Castaway["weeklyEvents"]): Castaway => ({
  id: "c",
  name: "Test",
  totalPoints: 0,
  eliminated: false,
  weeklyEvents,
});

describe("castawayEventBreakdown", () => {
  it("aggregates events across episodes into one row per type", () => {
    const c = make({
      "1": [{ eventType: "survived_episode", count: 1 }],
      "2": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "immunity_win", count: 1 },
      ],
    });
    const rows = castawayEventBreakdown(c, 50);
    const survived = rows.find((r) => r.label.startsWith("Survived Episode"));
    expect(survived?.label).toContain("×2");
    expect(survived?.points).toBe(2); // 1pt × 2
    expect(rows.find((r) => r.label === "Immunity Win")?.points).toBe(5);
  });

  it("sorts by point magnitude (biggest swings first)", () => {
    const c = make({
      "7": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "voted_out", count: 1 },
      ],
    });
    const rows = castawayEventBreakdown(c, 50);
    expect(rows[0].label).toBe("Voted Out");
    expect(rows[0].points).toBe(-10);
  });

  it("returns an empty list when there are no events", () => {
    expect(castawayEventBreakdown(make({}), 51)).toEqual([]);
  });
});
