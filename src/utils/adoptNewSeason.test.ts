import { describe, it, expect } from "vitest";
import { adoptNewSeason } from "./adoptNewSeason";
import type { League, TribeMember } from "@/types/league";

const member = (overrides: Partial<TribeMember> = {}): TribeMember =>
  ({
    userId: "u1",
    displayName: "Snuff Daddy",
    ownerName: "Jamie H.",
    avatar: "",
    tribeColor: "#E76F3C",
    totalPoints: 188,
    joinedAt: new Date("2026-02-25"),
    roster: ["c01", "c09", "c11"],
    weeklyRosters: [
      {
        week: 1,
        castawayIds: ["c01"],
        weekScore: 12,
        lockedAt: new Date("2026-02-26"),
      },
      {
        week: 2,
        castawayIds: ["c01", "c09"],
        weekScore: 22,
        lockedAt: new Date("2026-03-05"),
      },
    ],
    draftedAt: new Date("2026-02-25"),
    ...overrides,
  });

const league = (overrides: Partial<League> = {}): League =>
  ({
    id: "L1",
    name: "Smoke Signals",
    ownerId: "u1",
    ownerName: "Jamie H.",
    maxPlayers: 8,
    currentPlayers: 2,
    joinCode: "ABCDEF",
    members: ["u1", "u2"],
    memberDetails: [
      member(),
      member({ userId: "u2", displayName: "Idol Hands", totalPoints: 142 }),
    ],
    createdAt: new Date("2026-02-25"),
    updatedAt: new Date("2026-05-20"),
    status: "active",
    seasonNumber: 50,
    ...overrides,
  }) as League;

describe("adoptNewSeason", () => {
  it("bumps seasonNumber to the target", () => {
    const out = adoptNewSeason(league(), 51);
    expect(out.seasonNumber).toBe(51);
  });

  it("resets every member's roster, weeklyRosters, totalPoints, draftedAt", () => {
    const out = adoptNewSeason(league(), 51);
    for (const m of out.memberDetails) {
      expect(m.roster).toEqual([]);
      expect(m.weeklyRosters).toEqual([]);
      expect(m.totalPoints).toBe(0);
      expect(m.draftedAt).toBeUndefined();
    }
  });

  it("preserves identity fields on each member", () => {
    const out = adoptNewSeason(league(), 51);
    expect(out.memberDetails[0].userId).toBe("u1");
    expect(out.memberDetails[0].displayName).toBe("Snuff Daddy");
    expect(out.memberDetails[0].tribeColor).toBe("#E76F3C");
    expect(out.memberDetails[1].userId).toBe("u2");
  });

  it("preserves league-level identity (id, joinCode, members, owner)", () => {
    const before = league();
    const out = adoptNewSeason(before, 51);
    expect(out.id).toBe(before.id);
    expect(out.joinCode).toBe(before.joinCode);
    expect(out.members).toEqual(before.members);
    expect(out.ownerId).toBe(before.ownerId);
    expect(out.name).toBe(before.name);
  });

  it("archives the previous season's full member snapshot", () => {
    const out = adoptNewSeason(league(), 51);
    const archive = out.seasonArchive?.["50"];
    expect(archive).toBeDefined();
    expect(archive?.seasonNumber).toBe(50);
    expect(archive?.memberDetails).toHaveLength(2);
    expect(archive?.memberDetails[0].totalPoints).toBe(188);
    expect(archive?.memberDetails[0].weeklyRosters).toHaveLength(2);
    expect(archive?.memberDetails[0].weeklyRosters[1].weekScore).toBe(22);
  });

  it("deep-clones the archived weeklyRosters (reset mutations don't bleed through)", () => {
    const before = league();
    const out = adoptNewSeason(before, 51);
    // Mutate the live member's roster after the carry-over.
    out.memberDetails[0].roster.push("c99");
    expect(out.seasonArchive?.["50"].memberDetails[0].roster).not.toContain(
      "c99",
    );
  });

  it("preserves prior seasonArchive entries from earlier carry-overs", () => {
    const earlier = league({
      seasonArchive: {
        "49": {
          seasonNumber: 49,
          archivedAt: new Date("2025-12-15"),
          memberDetails: [],
        },
      },
    });
    const out = adoptNewSeason(earlier, 51);
    expect(Object.keys(out.seasonArchive ?? {}).sort()).toEqual(["49", "50"]);
  });

  it("throws when target equals current season", () => {
    expect(() => adoptNewSeason(league({ seasonNumber: 50 }), 50)).toThrow(
      /already on season 50/,
    );
  });

  it("throws if the current season already has an archive entry (idempotency guard)", () => {
    const guarded = league({
      seasonArchive: {
        "50": {
          seasonNumber: 50,
          archivedAt: new Date(),
          memberDetails: [],
        },
      },
    });
    expect(() => adoptNewSeason(guarded, 51)).toThrow(/archive entry/);
  });

  it("stamps updatedAt with the supplied archivedAt", () => {
    const when = new Date("2026-06-01T12:00:00Z");
    const out = adoptNewSeason(league(), 51, when);
    expect(out.updatedAt).toBe(when);
    expect(out.seasonArchive?.["50"].archivedAt).toBe(when);
  });
});
