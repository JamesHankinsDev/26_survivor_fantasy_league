import { describe, it, expect } from "vitest";
import {
  getCurrentWeek,
  getAvailableCastaways,
  isNetRosterChangeAllowed,
  getLatestLockedRoster,
} from "./scoring";
import { WeeklyRoster } from "@/types/league";

describe("scoring utils", () => {
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

  describe("getAvailableCastaways", () => {
    it("should filter out current roster members", () => {
      const allCastaways = [
        { id: "c1", name: "Castaway 1" },
        { id: "c2", name: "Castaway 2" },
        { id: "c3", name: "Castaway 3" },
      ];

      const currentRoster = ["c1"];
      const eliminated: string[] = [];

      const available = getAvailableCastaways(allCastaways, currentRoster, eliminated);

      expect(available).toHaveLength(2);
      expect(available.find((c) => c.id === "c1")).toBeUndefined();
    });

    it("should filter out eliminated castaways", () => {
      const allCastaways = [
        { id: "c1", name: "Castaway 1" },
        { id: "c2", name: "Castaway 2" },
        { id: "c3", name: "Castaway 3" },
      ];

      const currentRoster: string[] = [];
      const eliminated = ["c2"];

      const available = getAvailableCastaways(allCastaways, currentRoster, eliminated);

      expect(available).toHaveLength(2);
      expect(available.find((c) => c.id === "c2")).toBeUndefined();
    });
  });

  describe("isNetRosterChangeAllowed", () => {
    it("should allow change when 4 out of 5 castaways are same", () => {
      const previous = ["c1", "c2", "c3", "c4", "c5"];
      const proposed = ["c1", "c2", "c3", "c4", "c6"]; // Swapped c5 for c6

      expect(isNetRosterChangeAllowed(previous, proposed)).toBe(true);
    });

    it("should not allow change when less than 4 castaways are same", () => {
      const previous = ["c1", "c2", "c3", "c4", "c5"];
      const proposed = ["c1", "c2", "c3", "c6", "c7"]; // Only 3 same

      expect(isNetRosterChangeAllowed(previous, proposed)).toBe(false);
    });
  });

  describe("getLatestLockedRoster", () => {
    it("should return the most recent locked roster", () => {
      const weeklyRosters: WeeklyRoster[] = [
        { week: 2, castawayIds: ["c1", "c2"], weekScore: 25, lockedAt: new Date() },
        { week: 3, castawayIds: ["c1", "c3"], weekScore: 30, lockedAt: new Date() },
      ];

      const result = getLatestLockedRoster(weeklyRosters);
      expect(result).toEqual(["c1", "c3"]);
    });

    it("should return empty array if no weekly rosters exist", () => {
      const result = getLatestLockedRoster([]);
      expect(result).toEqual([]);
    });

    it("should return the highest week regardless of array order", () => {
      const weeklyRosters: WeeklyRoster[] = [
        { week: 4, castawayIds: ["c3", "c4"], weekScore: 15, lockedAt: new Date() },
        { week: 2, castawayIds: ["c1", "c2"], weekScore: 25, lockedAt: new Date() },
      ];

      const result = getLatestLockedRoster(weeklyRosters);
      expect(result).toEqual(["c3", "c4"]);
    });
  });
});
