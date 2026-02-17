import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger, logger, authLogger, dbLogger } from "./logger";

describe("Logger", () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Logger instance", () => {
    it("should create logger with default options", () => {
      const log = new Logger();
      expect(log).toBeDefined();
    });

    it("should create logger with custom prefix", () => {
      const log = new Logger({ prefix: "TEST" });
      log.error("Test message");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      expect(call.some((arg: string) => arg.includes("TEST"))).toBe(true);
    });

    it("should format messages with timestamp", () => {
      const log = new Logger({ timestamp: true });
      log.error("Test");

      const call = consoleErrorSpy.mock.calls[0];
      // Check for ISO timestamp format
      expect(call[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("should skip timestamp when disabled", () => {
      const log = new Logger({ timestamp: false });
      log.error("Test");

      const call = consoleErrorSpy.mock.calls[0];
      expect(call[0]).not.toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("Log levels", () => {
    it("should always log errors", () => {
      logger.error("Error message");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should always log warnings", () => {
      logger.warn("Warning message");
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("should include level in formatted message", () => {
      logger.error("Test");
      const call = consoleErrorSpy.mock.calls[0];
      expect(call.some((arg: string) => arg.includes("ERROR"))).toBe(true);
    });
  });

  describe("Child loggers", () => {
    it("should create child logger with nested prefix", () => {
      const parent = new Logger({ prefix: "Parent" });
      const child = parent.child("Child");

      child.error("Test");

      const call = consoleErrorSpy.mock.calls[0];
      expect(call.some((arg: string) => arg.includes("Parent:Child"))).toBe(
        true,
      );
    });

    it("should create child from logger without prefix", () => {
      const parent = new Logger({ timestamp: false });
      const child = parent.child("Child");

      child.error("Test");

      const call = consoleErrorSpy.mock.calls[0];
      expect(call.some((arg: string) => arg.includes("[Child]"))).toBe(true);
      // Should not have nested prefix (no ":")
      const childPrefixIndex = call.findIndex((arg: string) =>
        typeof arg === "string" && arg.includes("[Child]")
      );
      if (childPrefixIndex >= 0) {
        expect(call[childPrefixIndex]).not.toMatch(/.*:.*Child/);
      }
    });
  });

  describe("Specialized loggers", () => {
    it("should have authLogger with Auth prefix", () => {
      authLogger.error("Auth error");

      const call = consoleErrorSpy.mock.calls[0];
      expect(call.some((arg: string) => arg.includes("Auth"))).toBe(true);
    });

    it("should have dbLogger with Database prefix", () => {
      dbLogger.error("DB error");

      const call = consoleErrorSpy.mock.calls[0];
      expect(call.some((arg: string) => arg.includes("Database"))).toBe(true);
    });
  });

  describe("Multiple arguments", () => {
    it("should handle multiple arguments", () => {
      logger.error("Error:", { code: 500 }, "details");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      expect(call.length).toBeGreaterThan(3); // timestamp, level, message, object, details
    });
  });
});
