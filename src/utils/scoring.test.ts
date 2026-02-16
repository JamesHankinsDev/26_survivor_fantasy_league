import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateTribeTotalPoints,
  getCurrentWeek,
  getNextRosterLockTime,
  canAddDropCastaway,
  getAvailableCastaways,
  applyAddDropTransaction,
  isNetRosterChangeAllowed,
  formatPointsBreakdown,
} from "./scoring";
import { RosterEntry, TribeMember } from "@/types/league";

describe("scoring utils", () => {
  describe("calculateTribeTotalPoints", () => {
    it("should calculate total points for a tribe with active roster", () => {
      const tribeMember: TribeMember = {
        userId: "user1",
        displayName: "Test User",
        avatar: "",
        tribeColor: "#ff0000",
        points: 0,
        joinedAt: new Date(),
        roster: [
          {
            castawayId: "castaway1",
            status: "active",
            addedWeek: 0,
            accumulatedPoints: 0,
          },
          {
            castawayId: "castaway2",
            status: "active",
            addedWeek: 0,
            accumulatedPoints: 0,
          },
        ],
      };

      const episodeScoresMap = {
        1: { castaway1: 10, castaway2: 15 },
        2: { castaway1: 8, castaway2: 12 },
      };

      const total = calculateTribeTotalPoints(tribeMember, episodeScoresMap);
      expect(total).toBe(45); // 10 + 15 + 8 + 12
    });

    it("should not count points from dropped castaways after drop week", () => {
      const tribeMember: TribeMember = {
        userId: "user1",
        displayName: "Test User",
        avatar: "",
        tribeColor: "#ff0000",
        points: 0,
        joinedAt: new Date(),
        roster: [
          {
            castawayId: "castaway1",
            status: "dropped",
            addedWeek: 0,
            droppedWeek: 2,
            accumulatedPoints: 0,
          },
        ],
      };

      const episodeScoresMap = {
        1: { castaway1: 10 },
        2: { castaway1: 15 }, // Should not count (dropped at week 2)
        3: { castaway1: 20 }, // Should not count
      };

      const total = calculateTribeTotalPoints(tribeMember, episodeScoresMap);
      expect(total).toBe(10); // Only episode 1
    });

    it("should count points from added week onwards", () => {
      const tribeMember: TribeMember = {
        userId: "user1",
        displayName: "Test User",
        avatar: "",
        tribeColor: "#ff0000",
        points: 0,
        joinedAt: new Date(),
        roster: [
          {
            castawayId: "castaway1",
            status: "active",
            addedWeek: 2,
            accumulatedPoints: 0,
          },
        ],
      };

      const episodeScoresMap = {
        1: { castaway1: 10 }, // Should not count (added at week 2)
        2: { castaway1: 15 }, // Should count
        3: { castaway1: 20 }, // Should count
      };

      const total = calculateTribeTotalPoints(tribeMember, episodeScoresMap);
      expect(total).toBe(35); // 15 + 20
    });

    it("should return 0 for empty roster", () => {
      const tribeMember: TribeMember = {
        userId: "user1",
        displayName: "Test User",
        avatar: "",
        tribeColor: "#ff0000",
        points: 0,
        joinedAt: new Date(),
        roster: [],
      };

      const episodeScoresMap = {
        1: { castaway1: 10 },
      };

      const total = calculateTribeTotalPoints(tribeMember, episodeScoresMap);
      expect(total).toBe(0);
    });
  });

  describe("getCurrentWeek", () => {
    it("should return 0 before season start", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const week = getCurrentWeek(futureDate);
      expect(week).toBe(0);
    });

    it("should return correct week after season start", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 14); // 2 weeks ago

      const week = getCurrentWeek(pastDate);
      expect(week).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getNextRosterLockTime", () => {
    it("should return a Wednesday at 8pm", () => {
      const lockTime = getNextRosterLockTime();
      expect(lockTime.getDay()).toBe(3); // Wednesday
      expect(lockTime.getHours()).toBe(20); // 8pm
      expect(lockTime.getMinutes()).toBe(0);
    });

    it("should return a future date", () => {
      const lockTime = getNextRosterLockTime();
      const now = new Date();
      expect(lockTime.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe("canAddDropCastaway", () => {
    it("should return false for eliminated castaway", () => {
      const castaway: RosterEntry = {
        castawayId: "c1",
        status: "eliminated",
        addedWeek: 0,
        accumulatedPoints: 0,
      };

      expect(canAddDropCastaway(castaway, 2)).toBe(false);
    });

    it("should return false for already dropped castaway", () => {
      const castaway: RosterEntry = {
        castawayId: "c1",
        status: "dropped",
        addedWeek: 0,
        droppedWeek: 1,
        accumulatedPoints: 0,
      };

      expect(canAddDropCastaway(castaway, 2)).toBe(false);
    });

    it("should return true for active castaway", () => {
      const castaway: RosterEntry = {
        castawayId: "c1",
        status: "active",
        addedWeek: 0,
        accumulatedPoints: 0,
      };

      expect(canAddDropCastaway(castaway, 2)).toBe(true);
    });
  });

  describe("getAvailableCastaways", () => {
    it("should filter out active roster members", () => {
      const allCastaways = [
        { id: "c1", name: "Castaway 1" },
        { id: "c2", name: "Castaway 2" },
        { id: "c3", name: "Castaway 3" },
      ];

      const currentRoster: RosterEntry[] = [
        {
          castawayId: "c1",
          status: "active",
          addedWeek: 0,
          accumulatedPoints: 0,
        },
      ];

      const eliminated: string[] = [];

      const available = getAvailableCastaways(
        allCastaways,
        currentRoster,
        eliminated,
      );

      expect(available).toHaveLength(2);
      expect(available.find((c) => c.id === "c1")).toBeUndefined();
    });

    it("should filter out eliminated castaways", () => {
      const allCastaways = [
        { id: "c1", name: "Castaway 1" },
        { id: "c2", name: "Castaway 2" },
        { id: "c3", name: "Castaway 3" },
      ];

      const currentRoster: RosterEntry[] = [];
      const eliminated: string[] = ["c2"];

      const available = getAvailableCastaways(
        allCastaways,
        currentRoster,
        eliminated,
      );

      expect(available).toHaveLength(2);
      expect(available.find((c) => c.id === "c2")).toBeUndefined();
    });

    it("should allow dropped castaways to be re-added", () => {
      const allCastaways = [
        { id: "c1", name: "Castaway 1" },
        { id: "c2", name: "Castaway 2" },
      ];

      const currentRoster: RosterEntry[] = [
        {
          castawayId: "c1",
          status: "dropped",
          addedWeek: 0,
          droppedWeek: 1,
          accumulatedPoints: 0,
        },
      ];

      const eliminated: string[] = [];

      const available = getAvailableCastaways(
        allCastaways,
        currentRoster,
        eliminated,
      );

      expect(available).toHaveLength(2);
      expect(available.find((c) => c.id === "c1")).toBeDefined(); // Dropped can be re-added
    });
  });

  describe("applyAddDropTransaction", () => {
    it("should drop a castaway correctly", () => {
      const roster: RosterEntry[] = [
        {
          castawayId: "c1",
          status: "active",
          addedWeek: 0,
          accumulatedPoints: 50,
        },
      ];

      const newRoster = applyAddDropTransaction(roster, "c1", null, 3);

      expect(newRoster[0].status).toBe("dropped");
      expect(newRoster[0].droppedWeek).toBe(3);
    });

    it("should add a castaway correctly", () => {
      const roster: RosterEntry[] = [];

      const newRoster = applyAddDropTransaction(roster, null, "c2", 2);

      expect(newRoster).toHaveLength(1);
      expect(newRoster[0].castawayId).toBe("c2");
      expect(newRoster[0].status).toBe("active");
      expect(newRoster[0].addedWeek).toBe(2);
      expect(newRoster[0].accumulatedPoints).toBe(0);
    });

    it("should handle both drop and add in one transaction", () => {
      const roster: RosterEntry[] = [
        {
          castawayId: "c1",
          status: "active",
          addedWeek: 0,
          accumulatedPoints: 50,
        },
      ];

      const newRoster = applyAddDropTransaction(roster, "c1", "c2", 3);

      expect(newRoster).toHaveLength(2);
      expect(newRoster[0].status).toBe("dropped");
      expect(newRoster[1].castawayId).toBe("c2");
      expect(newRoster[1].status).toBe("active");
    });
  });

  describe("isNetRosterChangeAllowed", () => {
    it("should allow change when 4 out of 5 castaways are same", () => {
      const previousRoster: RosterEntry[] = [
        { castawayId: "c1", status: "active", addedWeek: 0, accumulatedPoints: 0 },
        { castawayId: "c2", status: "active", addedWeek: 0, accumulatedPoints: 0 },
        { castawayId: "c3", status: "active", addedWeek: 0, accumulatedPoints: 0 },
        { castawayId: "c4", status: "active", addedWeek: 0, accumulatedPoints: 0 },
        { castawayId: "c5", status: "active", addedWeek: 0, accumulatedPoints: 0 },
      ];

      const currentRoster: RosterEntry[] = [...previousRoster];

      // Drop c5, add c6 (4 out of 5 are the same)
      const isAllowed = isNetRosterChangeAllowed(
        previousRoster,
        currentRoster,
        "c6",
        "c5",
      );

      expect(isAllowed).toBe(true);
    });

    it("should not allow change when less than 4 castaways are same", () => {
      const previousRoster: RosterEntry[] = [
        { castawayId: "c1", status: "active", addedWeek: 0, accumulatedPoints: 0 },
        { castawayId: "c2", status: "active", addedWeek: 0, accumulatedPoints: 0 },
        { castawayId: "c3", status: "active", addedWeek: 0, accumulatedPoints: 0 },
        { castawayId: "c4", status: "active", addedWeek: 0, accumulatedPoints: 0 },
        { castawayId: "c5", status: "active", addedWeek: 0, accumulatedPoints: 0 },
      ];

      const currentRoster: RosterEntry[] = [
        { castawayId: "c1", status: "active", addedWeek: 0, accumulatedPoints: 0 },
        { castawayId: "c2", status: "active", addedWeek: 0, accumulatedPoints: 0 },
        { castawayId: "c3", status: "active", addedWeek: 0, accumulatedPoints: 0 },
        { castawayId: "c6", status: "active", addedWeek: 1, accumulatedPoints: 0 },
        { castawayId: "c7", status: "active", addedWeek: 1, accumulatedPoints: 0 },
      ];

      // Only 3 are the same (c1, c2, c3)
      const isAllowed = isNetRosterChangeAllowed(
        previousRoster,
        currentRoster,
        null,
        null,
      );

      expect(isAllowed).toBe(false);
    });
  });

  describe("formatPointsBreakdown", () => {
    it("should format breakdown correctly", () => {
      const breakdown = {
        immunityWins: 10,
        aliveBonus: 5,
        juryVotes: 3,
      };

      const formatted = formatPointsBreakdown(breakdown);
      expect(formatted).toContain("immunityWins: 10");
      expect(formatted).toContain("aliveBonus: 5");
      expect(formatted).toContain("juryVotes: 3");
    });

    it("should filter out zero values", () => {
      const breakdown = {
        immunityWins: 10,
        aliveBonus: 0,
        juryVotes: 5,
      };

      const formatted = formatPointsBreakdown(breakdown);
      expect(formatted).not.toContain("aliveBonus");
      expect(formatted).toContain("immunityWins: 10");
      expect(formatted).toContain("juryVotes: 5");
    });

    it("should return empty string for all zeros", () => {
      const breakdown = {
        immunityWins: 0,
        aliveBonus: 0,
      };

      const formatted = formatPointsBreakdown(breakdown);
      expect(formatted).toBe("");
    });
  });
});
