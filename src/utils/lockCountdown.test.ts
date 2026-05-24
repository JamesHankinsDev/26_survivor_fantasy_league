import { describe, it, expect } from "vitest";
import { getLockRemaining, getNextRosterLockDate } from "./lockCountdown";

describe("getNextRosterLockDate", () => {
  it("returns this Wednesday 8pm ET when called earlier on the same day", () => {
    // Tuesday 2025-03-04 12:00 UTC → next lock is Wed 2025-03-05 8pm ET
    const now = new Date("2025-03-04T12:00:00Z");
    const lock = getNextRosterLockDate(now);
    // 8pm EST = 01:00 UTC the following day (EST = UTC-5, March 5 pre-DST)
    expect(lock.toISOString()).toBe("2025-03-06T01:00:00.000Z");
  });

  it("rolls to next week when called after 8pm ET on Wednesday", () => {
    // Wed 2025-03-05 23:00 ET = Thu 2025-03-06 04:00 UTC, past the 8pm lock
    const now = new Date("2025-03-06T04:00:00Z");
    const lock = getNextRosterLockDate(now);
    expect(lock.toISOString()).toBe("2025-03-13T00:00:00.000Z");
    // 2025-03-09 is the US DST transition, so Wed 2025-03-12 8pm ET = EDT = 00:00 UTC Thu
  });

  it("handles DST correctly across spring-forward", () => {
    // Friday after DST starts (2025-03-09). Wed 2025-03-12 8pm EDT = 00:00 UTC Thu
    const now = new Date("2025-03-10T12:00:00Z");
    const lock = getNextRosterLockDate(now);
    expect(lock.toISOString()).toBe("2025-03-13T00:00:00.000Z");
  });
});

describe("getLockRemaining", () => {
  it("breaks a multi-day delta into d/h/m/s", () => {
    const now = new Date("2025-03-04T12:00:00Z");
    const target = new Date("2025-03-06T15:30:45Z"); // +2d 3h 30m 45s
    const r = getLockRemaining(target, now);
    expect(r.days).toBe(2);
    expect(r.hours).toBe(3);
    expect(r.minutes).toBe(30);
    expect(r.seconds).toBe(45);
    expect(r.totalMs).toBeGreaterThan(0);
  });

  it("clamps to zero once the target is in the past", () => {
    const now = new Date("2025-03-06T16:00:00Z");
    const target = new Date("2025-03-04T12:00:00Z");
    const r = getLockRemaining(target, now);
    expect(r).toMatchObject({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
  });
});
