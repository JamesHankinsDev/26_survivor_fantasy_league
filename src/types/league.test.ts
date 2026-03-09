import { describe, it, expect } from "vitest";
import {
  getMemberRank,
  generateJoinCode,
  generateLeagueId,
  getLeagueJoinUrl,
  TribeMember,
} from "./league";

describe("league type helpers", () => {
  describe("getMemberRank", () => {
    const members: TribeMember[] = [
      {
        userId: "user1",
        displayName: "Alice",
        avatar: "",
        tribeColor: "#ff0000",
        totalPoints: 100,
        joinedAt: new Date(),
        roster: [],
        weeklyRosters: [],
      },
      {
        userId: "user2",
        displayName: "Bob",
        avatar: "",
        tribeColor: "#00ff00",
        totalPoints: 200,
        joinedAt: new Date(),
        roster: [],
        weeklyRosters: [],
      },
      {
        userId: "user3",
        displayName: "Charlie",
        avatar: "",
        tribeColor: "#0000ff",
        totalPoints: 150,
        joinedAt: new Date(),
        roster: [],
        weeklyRosters: [],
      },
    ];

    it("should return correct rank for first place", () => {
      const rank = getMemberRank(members, "user2"); // 200 points
      expect(rank).toBe(1);
    });

    it("should return correct rank for second place", () => {
      const rank = getMemberRank(members, "user3"); // 150 points
      expect(rank).toBe(2);
    });

    it("should return correct rank for last place", () => {
      const rank = getMemberRank(members, "user1"); // 100 points
      expect(rank).toBe(3);
    });

    it("should return 0 for non-existent user", () => {
      const rank = getMemberRank(members, "nonexistent");
      expect(rank).toBe(0);
    });

    it("should handle tied scores correctly", () => {
      const membersWithTie: TribeMember[] = [
        {
          userId: "user1",
          displayName: "Alice",
          avatar: "",
          tribeColor: "#ff0000",
          totalPoints: 100,
          joinedAt: new Date(),
          roster: [],
          weeklyRosters: [],
        },
        {
          userId: "user2",
          displayName: "Bob",
          avatar: "",
          tribeColor: "#00ff00",
          totalPoints: 100,
          joinedAt: new Date(),
          roster: [],
          weeklyRosters: [],
        },
      ];

      // Both should get a rank (order may vary but both should be ranked)
      const rank1 = getMemberRank(membersWithTie, "user1");
      const rank2 = getMemberRank(membersWithTie, "user2");

      expect(rank1).toBeGreaterThan(0);
      expect(rank2).toBeGreaterThan(0);
    });

    it("should handle empty members array", () => {
      const rank = getMemberRank([], "user1");
      expect(rank).toBe(0);
    });
  });

  describe("generateJoinCode", () => {
    it("should generate a 6-character code", () => {
      const code = generateJoinCode();
      expect(code).toHaveLength(6);
    });

    it("should only contain alphanumeric characters", () => {
      const code = generateJoinCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it("should generate unique codes", () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateJoinCode());
      }
      // Should have many unique codes (not guaranteed 100 but very likely)
      expect(codes.size).toBeGreaterThan(90);
    });

    it("should be uppercase", () => {
      const code = generateJoinCode();
      expect(code).toBe(code.toUpperCase());
    });
  });

  describe("generateLeagueId", () => {
    it("should start with 'league_'", () => {
      const id = generateLeagueId();
      expect(id).toMatch(/^league_/);
    });

    it("should contain timestamp", () => {
      const beforeTimestamp = Date.now();
      const id = generateLeagueId();
      const afterTimestamp = Date.now();

      // Extract timestamp from ID (format: league_<timestamp>_<random>)
      const parts = id.split("_");
      const timestamp = parseInt(parts[1]);

      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it("should generate unique IDs", () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateLeagueId());
      }
      expect(ids.size).toBe(100); // All should be unique
    });

    it("should have 3 parts separated by underscores", () => {
      const id = generateLeagueId();
      const parts = id.split("_");
      expect(parts).toHaveLength(3); // league, timestamp, random
    });
  });

  describe("getLeagueJoinUrl", () => {
    it("should generate correct URL format", () => {
      const joinCode = "ABC123";
      const url = getLeagueJoinUrl(joinCode);

      expect(url).toContain("/join/ABC123");
    });

    it("should handle different join codes", () => {
      const codes = ["XYZ789", "TEST01", "JOIN99"];

      codes.forEach((code) => {
        const url = getLeagueJoinUrl(code);
        expect(url).toContain(`/join/${code}`);
      });
    });

    it("should return relative path when window is not defined", () => {
      // In test environment, window might not be defined or origin might be empty
      const joinCode = "TEST01";
      const url = getLeagueJoinUrl(joinCode);

      // Should at least have the path portion
      expect(url).toMatch(/\/join\/TEST01$/);
    });
  });
});
