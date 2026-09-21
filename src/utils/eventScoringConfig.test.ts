import { describe, it, expect } from "vitest";
import { ALL_EVENT_TYPES, getEventDescription, getEventLabel } from "./eventScoringConfig";
import { getScoringConfig } from "./seasonScoringConfig";

describe("event catalogue", () => {
  it("covers every event type with a label and a description", () => {
    for (const eventType of ALL_EVENT_TYPES) {
      expect(getEventLabel(eventType), eventType).toBeTruthy();
      const { title, description } = getEventDescription(eventType);
      expect(title, eventType).toBeTruthy();
      expect(description, eventType).toBeTruthy();
    }
  });

  it("keeps idol and advantage events distinct, found and used", () => {
    // The About page used to fold these into "Found Idol/Advantage" and
    // "Successfully Used Idol/Advantage", which stopped being true once S51
    // priced them separately.
    for (const eventType of [
      "found_idol",
      "found_advantage",
      "used_idol_successfully",
      "used_advantage_successfully",
    ] as const) {
      expect(ALL_EVENT_TYPES).toContain(eventType);
    }
    const titles = ALL_EVENT_TYPES.map((e) => getEventDescription(e).title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("never hardcodes a point value in description prose", () => {
    // Point values belong to the per-season config. Baking them into these
    // strings is how they silently went stale across the S50 → S51 change.
    for (const eventType of ALL_EVENT_TYPES) {
      const { description } = getEventDescription(eventType);
      expect(description, `${eventType}: "${description}"`).not.toMatch(
        /[+-]\d+\s*point|worth\s*[+-]?\d+|deducts/i,
      );
    }
  });
});

describe("Season 51 scores every idol and advantage action", () => {
  const s51 = getScoringConfig(51);

  it("pays for finding an idol and for finding an advantage", () => {
    expect(s51.found_idol).toBeGreaterThan(0);
    expect(s51.found_advantage).toBeGreaterThan(0);
  });

  it("pays for successfully using an idol and an advantage", () => {
    expect(s51.used_idol_successfully).toBeGreaterThan(0);
    expect(s51.used_advantage_successfully).toBeGreaterThan(0);
  });

  it("ranks finding above using, and idols above advantages", () => {
    expect(s51.found_idol).toBeGreaterThan(s51.used_idol_successfully);
    expect(s51.found_advantage).toBeGreaterThan(s51.used_advantage_successfully);
    expect(s51.found_idol).toBeGreaterThan(s51.found_advantage);
    expect(s51.used_idol_successfully).toBeGreaterThan(
      s51.used_advantage_successfully,
    );
  });
});
