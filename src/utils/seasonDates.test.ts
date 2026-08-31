import { describe, it, expect } from "vitest";
import { parseSeasonDate, formatSeasonDate, daysUntilSeasonDate } from "./seasonDates";

describe("parseSeasonDate", () => {
  it("keeps the calendar day, unlike new Date(iso)", () => {
    const d = parseSeasonDate("2026-09-23");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8); // September, 0-indexed
    expect(d.getDate()).toBe(23);
  });

  it("is local midnight, not UTC midnight", () => {
    // The regression: new Date("2026-09-23") is UTC midnight, which renders as
    // the 22nd anywhere west of Greenwich.
    expect(parseSeasonDate("2026-09-23").getHours()).toBe(0);
  });
});

describe("formatSeasonDate", () => {
  it("renders the S51 premiere as September 23rd, a Wednesday", () => {
    expect(
      formatSeasonDate("2026-09-23", { weekday: "long", month: "long", day: "numeric" }),
    ).toBe("Wednesday, September 23");
  });

  it("renders the S50 finale as its stored date", () => {
    expect(formatSeasonDate("2026-05-20")).toBe("May 20, 2026");
  });

  it("does not shift across a month boundary", () => {
    expect(formatSeasonDate("2026-10-01")).toBe("October 1, 2026");
    expect(formatSeasonDate("2026-01-01")).toBe("January 1, 2026");
  });
});

describe("daysUntilSeasonDate", () => {
  it("counts whole calendar days", () => {
    expect(daysUntilSeasonDate("2026-09-23", new Date(2026, 8, 20, 9, 0))).toBe(3);
  });

  it("is 0 on the day itself, regardless of the hour", () => {
    expect(daysUntilSeasonDate("2026-09-23", new Date(2026, 8, 23, 1, 0))).toBe(0);
    expect(daysUntilSeasonDate("2026-09-23", new Date(2026, 8, 23, 23, 0))).toBe(0);
  });

  it("stays 1 all through the previous day", () => {
    // The bug a naive ms-diff introduces: late on the 22nd it would round to 0.
    expect(daysUntilSeasonDate("2026-09-23", new Date(2026, 8, 22, 8, 0))).toBe(1);
    expect(daysUntilSeasonDate("2026-09-23", new Date(2026, 8, 22, 23, 30))).toBe(1);
  });

  it("floors at 0 once the date has passed", () => {
    expect(daysUntilSeasonDate("2026-09-23", new Date(2026, 8, 30))).toBe(0);
  });

  it("survives a DST transition in the span", () => {
    // Nov 1 2026 is the EDT->EST switch; a raw ms diff would give 30.04 days.
    expect(daysUntilSeasonDate("2026-11-30", new Date(2026, 9, 31, 12, 0))).toBe(30);
  });
});
