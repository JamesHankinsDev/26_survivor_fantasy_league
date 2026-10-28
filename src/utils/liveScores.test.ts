import { describe, it, expect } from "vitest";
import { buildEpisodeScoresMap, computeLiveTotal } from "./liveScores";
import { getScoringConfig } from "./seasonScoringConfig";

describe("liveScores", () => {
  const season = 51;
  const immunity = getScoringConfig(season).immunity_win;

  const castaways = [
    { id: "a", weeklyEvents: { "2": [{ eventType: "immunity_win" as const, count: 1 }] } },
    { id: "b", weeklyEvents: { "2": [{ eventType: "immunity_win" as const, count: 2 }] } },
  ];

  it("builds per-episode castaway points", () => {
    expect(buildEpisodeScoresMap(castaways, season)).toEqual({
      2: { a: immunity, b: 2 * immunity },
    });
  });

  it("only counts castaways on that week's locked roster", () => {
    const map = buildEpisodeScoresMap(castaways, season);
    const member = {
      totalPoints: 999,
      weeklyRosters: [{ week: 2, castawayIds: ["a"], weekScore: 0, lockedAt: null }],
    };
    expect(computeLiveTotal(member, map, season)).toBe(immunity);
  });

  it("falls back to the stored total before any lock", () => {
    expect(computeLiveTotal({ totalPoints: 7, weeklyRosters: [] }, {}, season)).toBe(7);
  });
});
