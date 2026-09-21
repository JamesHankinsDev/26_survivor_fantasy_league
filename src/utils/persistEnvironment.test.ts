import { describe, it, expect } from "vitest";
import { isProductionRuntime } from "./persistEnvironment";

describe("isProductionRuntime", () => {
  describe("with a Vercel env signal (authoritative)", () => {
    it("persists only on production", () => {
      expect(isProductionRuntime("production", "anything")).toBe(true);
    });

    it("does not persist on preview deployments", () => {
      expect(isProductionRuntime("preview", "sfl-git-main.vercel.app")).toBe(false);
    });

    it("does not persist on vercel dev", () => {
      expect(isProductionRuntime("development", "localhost")).toBe(false);
    });

    it("ignores the hostname entirely when the env is known", () => {
      // A production deployment served from an unusual host is still prod.
      expect(isProductionRuntime("production", "192.168.1.9")).toBe(true);
    });
  });

  describe("falling back to the hostname", () => {
    it("treats a real domain as production", () => {
      expect(isProductionRuntime(undefined, "survivorfantasy.app")).toBe(true);
      expect(isProductionRuntime(undefined, "sfl.vercel.app")).toBe(true);
    });

    it("refuses localhost in every spelling", () => {
      for (const host of ["localhost", "LOCALHOST", "127.0.0.1", "0.0.0.0", "::1"]) {
        expect(isProductionRuntime(undefined, host)).toBe(false);
      }
    });

    it("refuses .local and .localhost suffixes", () => {
      expect(isProductionRuntime(undefined, "jamess-macbook.local")).toBe(false);
      expect(isProductionRuntime(undefined, "app.localhost")).toBe(false);
    });

    it("refuses private LAN addresses — `next dev` reached from a phone", () => {
      for (const host of ["192.168.1.9", "10.0.0.4", "172.16.3.2", "172.31.255.1"]) {
        expect(isProductionRuntime(undefined, host)).toBe(false);
      }
    });

    it("does not mistake a public IP in the 172 block for a private one", () => {
      // 172.15 and 172.32 sit outside the private 172.16-172.31 range.
      expect(isProductionRuntime(undefined, "172.15.0.1")).toBe(true);
      expect(isProductionRuntime(undefined, "172.32.0.1")).toBe(true);
    });

    it("refuses to write when there is no hostname at all (SSR)", () => {
      expect(isProductionRuntime(undefined, undefined)).toBe(false);
    });
  });
});
