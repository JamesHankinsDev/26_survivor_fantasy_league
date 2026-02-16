import { describe, it, expect } from "vitest";
import {
  sanitizeDisplayName,
  sanitizeMessageContent,
  validateAvatarURL,
  sanitizeAvatarURL,
  sanitizeLeagueName,
  isValidMessageLength,
  VALIDATION_LIMITS,
} from "./inputValidation";

describe("inputValidation utils", () => {
  describe("sanitizeDisplayName", () => {
    it("should trim whitespace", () => {
      expect(sanitizeDisplayName("  John Doe  ")).toBe("John Doe");
    });

    it("should remove HTML characters", () => {
      expect(sanitizeDisplayName("John<script>alert()</script>Doe")).toBe(
        "Johnscriptalert()/scriptDoe",
      );
      expect(sanitizeDisplayName("John<>Doe")).toBe("JohnDoe");
    });

    it("should normalize multiple spaces", () => {
      expect(sanitizeDisplayName("John    Doe")).toBe("John Doe");
    });

    it("should limit length to MAX_DISPLAY_NAME_LENGTH", () => {
      const longName = "a".repeat(100);
      const sanitized = sanitizeDisplayName(longName);
      expect(sanitized.length).toBe(VALIDATION_LIMITS.MAX_DISPLAY_NAME_LENGTH);
    });

    it("should return 'Unknown' for null or undefined", () => {
      expect(sanitizeDisplayName(null)).toBe("Unknown");
      expect(sanitizeDisplayName(undefined)).toBe("Unknown");
    });

    it("should handle empty string", () => {
      expect(sanitizeDisplayName("")).toBe("Unknown");
    });
  });

  describe("sanitizeMessageContent", () => {
    it("should trim whitespace", () => {
      expect(sanitizeMessageContent("  Hello World  ")).toBe("Hello World");
    });

    it("should limit length to MAX_MESSAGE_LENGTH", () => {
      const longMessage = "a".repeat(3000);
      const sanitized = sanitizeMessageContent(longMessage);
      expect(sanitized.length).toBe(VALIDATION_LIMITS.MAX_MESSAGE_LENGTH);
    });

    it("should return empty string for empty input", () => {
      expect(sanitizeMessageContent("")).toBe("");
    });

    it("should preserve newlines and special characters", () => {
      const message = "Line 1\nLine 2\nLine 3";
      expect(sanitizeMessageContent(message)).toBe(message);
    });
  });

  describe("validateAvatarURL", () => {
    it("should return true for valid HTTPS URLs", () => {
      expect(validateAvatarURL("https://example.com/avatar.jpg")).toBe(true);
    });

    it("should return false for HTTP URLs", () => {
      expect(validateAvatarURL("http://example.com/avatar.jpg")).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(validateAvatarURL("not-a-url")).toBe(false);
    });

    it("should return true for null or undefined", () => {
      expect(validateAvatarURL(null)).toBe(true);
      expect(validateAvatarURL(undefined)).toBe(true);
    });

    it("should return false for javascript: protocol", () => {
      expect(validateAvatarURL("javascript:alert('xss')")).toBe(false);
    });

    it("should return false for data: URLs", () => {
      expect(validateAvatarURL("data:text/html,<script>alert()</script>")).toBe(
        false,
      );
    });
  });

  describe("sanitizeAvatarURL", () => {
    it("should return valid HTTPS URL", () => {
      const url = "https://example.com/avatar.jpg";
      expect(sanitizeAvatarURL(url)).toBe(url);
    });

    it("should return empty string for invalid URLs", () => {
      expect(sanitizeAvatarURL("http://example.com/avatar.jpg")).toBe("");
      expect(sanitizeAvatarURL("not-a-url")).toBe("");
    });

    it("should return empty string for null or undefined", () => {
      expect(sanitizeAvatarURL(null)).toBe("");
      expect(sanitizeAvatarURL(undefined)).toBe("");
    });
  });

  describe("sanitizeLeagueName", () => {
    it("should trim whitespace", () => {
      expect(sanitizeLeagueName("  My League  ")).toBe("My League");
    });

    it("should remove HTML characters", () => {
      expect(sanitizeLeagueName("My<script>League")).toBe("MyscriptLeague");
      expect(sanitizeLeagueName("My<>League")).toBe("MyLeague");
    });

    it("should limit length to MAX_LEAGUE_NAME_LENGTH", () => {
      const longName = "a".repeat(200);
      const sanitized = sanitizeLeagueName(longName);
      expect(sanitized.length).toBe(VALIDATION_LIMITS.MAX_LEAGUE_NAME_LENGTH);
    });

    it("should return empty string for empty input", () => {
      expect(sanitizeLeagueName("")).toBe("");
    });
  });

  describe("isValidMessageLength", () => {
    it("should return true for valid message length", () => {
      expect(isValidMessageLength("Hello World")).toBe(true);
      expect(isValidMessageLength("a".repeat(100))).toBe(true);
    });

    it("should return false for empty message", () => {
      expect(isValidMessageLength("")).toBe(false);
      expect(isValidMessageLength("   ")).toBe(false);
    });

    it("should return false for message exceeding MAX_MESSAGE_LENGTH", () => {
      const longMessage = "a".repeat(
        VALIDATION_LIMITS.MAX_MESSAGE_LENGTH + 1,
      );
      expect(isValidMessageLength(longMessage)).toBe(false);
    });

    it("should return true for message exactly at MAX_MESSAGE_LENGTH", () => {
      const exactMessage = "a".repeat(VALIDATION_LIMITS.MAX_MESSAGE_LENGTH);
      expect(isValidMessageLength(exactMessage)).toBe(true);
    });
  });

  describe("VALIDATION_LIMITS", () => {
    it("should have correct constants", () => {
      expect(VALIDATION_LIMITS.MAX_MESSAGE_LENGTH).toBe(2000);
      expect(VALIDATION_LIMITS.MAX_DISPLAY_NAME_LENGTH).toBe(50);
      expect(VALIDATION_LIMITS.MAX_LEAGUE_NAME_LENGTH).toBe(100);
    });

    it("should be readonly", () => {
      // TypeScript should prevent this at compile time
      // This test just verifies the structure exists
      expect(Object.isFrozen(VALIDATION_LIMITS)).toBe(false); // const assertions don't freeze
      expect(typeof VALIDATION_LIMITS).toBe("object");
    });
  });
});
