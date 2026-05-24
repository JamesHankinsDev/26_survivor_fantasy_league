import { describe, it, expect, beforeEach } from "vitest";
import { pickActiveLeague } from "./activeLeague";
import type { League } from "@/types/league";
import type { Season } from "@/data/seasons";

const seasons: Season[] = [
  {
    number: 49,
    name: "Survivor 49",
    theme: "Older era",
    premiereDate: "2024-09-01",
    isActive: false,
    concludedAt: "2024-12-15",
  },
  {
    number: 50,
    name: "Survivor 50",
    theme: "Fans season",
    premiereDate: "2026-02-25",
    isActive: false,
    concludedAt: "2026-05-20",
  },
  {
    number: 51,
    name: "Survivor 51",
    theme: "Upcoming",
    premiereDate: "2026-09-23",
    isActive: false,
  },
  {
    number: 52,
    name: "Survivor 52",
    theme: "In play",
    premiereDate: "2025-02-01",
    isActive: true,
  },
];

const mkLeague = (id: string, seasonNumber: number): League =>
  ({
    id,
    name: `League ${id}`,
    seasonNumber,
    ownerId: "u1",
    ownerName: "Owner",
    maxPlayers: 8,
    currentPlayers: 1,
    joinCode: "ABC",
    members: ["u1"],
    memberDetails: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "active",
  }) as League;

// Minimal in-memory Storage stand-in so we can assert preference order
// without leaning on jsdom's localStorage.
const makeStorage = (initial: Record<string, string> = {}): Storage => {
  const store: Record<string, string> = { ...initial };
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = v;
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

describe("pickActiveLeague", () => {
  let storage: Storage;
  beforeEach(() => {
    storage = makeStorage();
  });

  it("returns null when the user has zero leagues", () => {
    expect(pickActiveLeague([], seasons, storage)).toBeNull();
  });

  it("returns null when every league is in a concluded season", () => {
    const leagues = [mkLeague("a", 49), mkLeague("b", 50)];
    expect(pickActiveLeague(leagues, seasons, storage)).toBeNull();
  });

  it("returns a league whose season is currently active", () => {
    const leagues = [mkLeague("a", 50), mkLeague("b", 52)];
    expect(pickActiveLeague(leagues, seasons, storage)?.id).toBe("b");
  });

  it("treats upcoming-season leagues as eligible", () => {
    const leagues = [mkLeague("a", 50), mkLeague("b", 51)];
    expect(pickActiveLeague(leagues, seasons, storage)?.id).toBe("b");
  });

  it("prefers the localStorage last-viewed league when it's still eligible", () => {
    const leagues = [mkLeague("a", 52), mkLeague("b", 51)];
    storage.setItem("survivor:lastViewedLeagueId", "b");
    expect(pickActiveLeague(leagues, seasons, storage)?.id).toBe("b");
  });

  it("ignores a stored league that's no longer in the user's list", () => {
    const leagues = [mkLeague("a", 52)];
    storage.setItem("survivor:lastViewedLeagueId", "ghost");
    expect(pickActiveLeague(leagues, seasons, storage)?.id).toBe("a");
  });

  it("ignores a stored league whose season has since concluded", () => {
    // 'a' (S49 concluded) was last viewed, but only 'b' is eligible now.
    const leagues = [mkLeague("a", 49), mkLeague("b", 52)];
    storage.setItem("survivor:lastViewedLeagueId", "a");
    expect(pickActiveLeague(leagues, seasons, storage)?.id).toBe("b");
  });

  it("falls back to the first eligible league with no storage", () => {
    const leagues = [mkLeague("a", 51), mkLeague("b", 52)];
    expect(pickActiveLeague(leagues, seasons, null)?.id).toBe("a");
  });
});
