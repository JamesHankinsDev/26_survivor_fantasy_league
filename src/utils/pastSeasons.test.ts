import { describe, it, expect } from "vitest";
import { listPastSeasons } from "./pastSeasons";
import type { League, TribeMember } from "@/types/league";
import type { Season } from "@/data/seasons";

const member = (overrides: Partial<TribeMember> = {}): TribeMember =>
  ({
    userId: "u1",
    displayName: "Snuff Daddy",
    avatar: "",
    tribeColor: "#E76F3C",
    totalPoints: 100,
    joinedAt: new Date(),
    roster: [],
    weeklyRosters: [],
    ...overrides,
  }) as TribeMember;

const league = (overrides: Partial<League> = {}): League =>
  ({
    id: "L1",
    name: "Smoke Signals",
    ownerId: "u1",
    ownerName: "Jamie H.",
    maxPlayers: 8,
    currentPlayers: 1,
    joinCode: "ABCDEF",
    members: ["u1"],
    memberDetails: [member()],
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "active",
    seasonNumber: 50,
    ...overrides,
  }) as League;

const seasons: Season[] = [
  {
    number: 49,
    name: "Survivor 49",
    theme: "",
    premiereDate: "2024-09-01",
    isActive: false,
    concludedAt: "2024-12-15",
  },
  {
    number: 50,
    name: "Survivor 50",
    theme: "",
    premiereDate: "2026-02-25",
    isActive: false,
    concludedAt: "2026-05-20",
  },
  {
    number: 51,
    name: "Survivor 51",
    theme: "",
    premiereDate: "2026-09-23",
    isActive: false,
  },
  {
    number: 52,
    name: "Survivor 52",
    theme: "",
    premiereDate: "2027-01-01",
    isActive: true,
  },
];

describe("listPastSeasons", () => {
  it("returns empty when the user has no leagues", () => {
    expect(listPastSeasons([], seasons)).toEqual([]);
  });

  it("returns empty when leagues are only on current/upcoming seasons", () => {
    const onlyActive = [league({ seasonNumber: 52 })];
    expect(listPastSeasons(onlyActive, seasons)).toEqual([]);
  });

  it("surfaces a concluded league's live memberDetails as a past entry", () => {
    const concluded = [league({ seasonNumber: 50, memberDetails: [member()] })];
    const out = listPastSeasons(concluded, seasons);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      leagueId: "L1",
      seasonNumber: 50,
      fromArchive: false,
    });
  });

  it("surfaces seasonArchive snapshots", () => {
    const carriedOver = [
      league({
        seasonNumber: 52, // currently on an active season
        seasonArchive: {
          "50": {
            seasonNumber: 50,
            archivedAt: new Date(),
            memberDetails: [member({ totalPoints: 188 })],
          },
        },
      }),
    ];
    const out = listPastSeasons(carriedOver, seasons);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      seasonNumber: 50,
      fromArchive: true,
    });
    expect(out[0].memberDetails[0].totalPoints).toBe(188);
  });

  it("dedupes when both archive and live data refer to the same season", () => {
    const both = [
      league({
        seasonNumber: 50,
        memberDetails: [member()],
        seasonArchive: {
          "50": {
            seasonNumber: 50,
            archivedAt: new Date(),
            memberDetails: [member({ totalPoints: 999 })],
          },
        },
      }),
    ];
    const out = listPastSeasons(both, seasons);
    expect(out).toHaveLength(1);
    // Archive wins (it's added first in the iteration).
    expect(out[0].fromArchive).toBe(true);
    expect(out[0].memberDetails[0].totalPoints).toBe(999);
  });

  it("sorts by league name asc then season number desc", () => {
    const multi = [
      league({
        id: "Lb",
        name: "Bunker Pals",
        seasonNumber: 49,
        memberDetails: [member()],
      }),
      league({
        id: "La",
        name: "Aztec Crew",
        seasonNumber: 50,
        memberDetails: [member()],
      }),
      league({
        id: "La",
        name: "Aztec Crew",
        seasonNumber: 49,
        memberDetails: [member()],
      }),
    ];
    const out = listPastSeasons(multi, seasons);
    expect(out.map((e) => `${e.leagueName}/${e.seasonNumber}`)).toEqual([
      "Aztec Crew/50",
      "Aztec Crew/49",
      "Bunker Pals/49",
    ]);
  });

  it("ignores archive keys that aren't numeric (defensive)", () => {
    const weird = [
      league({
        seasonNumber: 52,
        seasonArchive: {
          "50": {
            seasonNumber: 50,
            archivedAt: new Date(),
            memberDetails: [member()],
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          junk: { seasonNumber: 0, archivedAt: new Date(), memberDetails: [] } as any,
        },
      }),
    ];
    const out = listPastSeasons(weird, seasons);
    expect(out).toHaveLength(1);
    expect(out[0].seasonNumber).toBe(50);
  });
});
