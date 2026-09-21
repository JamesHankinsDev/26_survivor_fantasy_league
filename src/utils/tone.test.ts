import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * This is a friends-and-family app. Survivor's own vocabulary (voted out,
 * eliminated, torch snuffed) is the right register; mortuary imagery is not.
 *
 * Added after "by the finale you might have two corpses and one live castaway"
 * shipped into the how-to-play walkthrough.
 */
const BANNED = /\b(corpse|corpses|carcass|carcasses|cadaver|rotting|decaying)\b/i;

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, acc);
    } else if (/\.(tsx?|md)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("player-facing tone", () => {
  it("keeps mortuary imagery out of the source", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      const contents = readFileSync(file, "utf8");
      contents.split("\n").forEach((line, i) => {
        if (BANNED.test(line)) {
          offenders.push(`${file.replace(process.cwd() + "/", "")}:${i + 1} — ${line.trim()}`);
        }
      });
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
