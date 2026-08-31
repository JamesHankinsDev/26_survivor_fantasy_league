/**
 * Episode scoring drafter.
 *
 * Survivor airs Wednesday 8pm ET. From Thursday midnight ET — about two hours
 * after the episode ends — this reads published recaps and drafts the episode's
 * scoring events, so the admin reviews a filled-in form instead of transcribing
 * 21 castaways x 13 event types by hand. Not every outlet has published by
 * then, so the caller retries across a 12-hour window (see inScorerWindow).
 *
 * IT NEVER COMMITS SCORES. It writes one document —
 * `seasons/{n}/pendingScores/{episode}` — which the admin scores page reads and
 * pre-fills. Saving still goes through the existing saveEpisodeScores path,
 * with a human pressing the button.
 *
 * That boundary is deliberate. saveEpisodeScores cascades across every league
 * and recomputes totals from deltas; there is no undo. A recap that garbles who
 * went home would silently rewrite everyone's standings, and nobody would
 * notice until they questioned their score. Drafting removes the tedium without
 * moving the decision.
 *
 * Accuracy is uneven by event type, and the prompt says so: eliminations and
 * challenge wins are stated plainly in every recap; idol and advantage plays
 * are inconsistently covered because the show deliberately obscures them. Those
 * come back low-confidence rather than guessed.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { Timestamp } from "firebase-admin/firestore";

/** Point values by season — mirrors src/utils/seasonScoringConfig.ts. */
const SEASON_SCORING = {
  50: {
    immunity_win: 5, team_challenge_win: 3, found_idol: 5, found_advantage: 0,
    used_idol_successfully: 3, used_advantage_successfully: 0, voted_at_tribal: 3,
    survived_episode: 1, fire_making_win: 5, made_final_three: 5, season_winner: 10,
    made_jury: 3, voted_out: -10,
  },
  51: {
    immunity_win: 5, team_challenge_win: 3, found_idol: 5, found_advantage: 2,
    used_idol_successfully: 3, used_advantage_successfully: 1, voted_at_tribal: 3,
    survived_episode: 0, fire_making_win: 5, made_final_three: 10, season_winner: 25,
    made_jury: 3, voted_out: -5,
  },
};

const EVENT_TYPES = Object.keys(SEASON_SCORING[51]);

/** Events a recap reports reliably vs. ones the show hides on purpose. */
const RELIABLE = [
  "voted_out", "immunity_win", "team_challenge_win", "made_jury",
  "made_final_three", "season_winner", "fire_making_win",
];

const DraftSchema = z.object({
  episodeFound: z
    .boolean()
    .describe("False if no recap of this specific episode could be found."),
  episodeTitle: z.string().nullable(),
  airDate: z.string().nullable().describe("ISO date the episode aired, if stated."),
  sources: z
    .array(z.object({ url: z.string(), title: z.string() }))
    .describe("Recaps actually read. Empty if none were found."),
  castaways: z.array(
    z.object({
      castawayId: z.string().describe("Must be one of the provided cast ids."),
      castawayName: z.string(),
      events: z.array(
        z.object({
          eventType: z.enum(EVENT_TYPES),
          count: z.number().int().min(1),
          confidence: z.enum(["high", "medium", "low"]),
          evidence: z.string().describe("Short quote or paraphrase supporting this."),
        }),
      ),
    }),
  ),
  unresolved: z
    .array(z.string())
    .describe("Plain-language notes on anything the admin must check by hand."),
  summary: z.string().describe("Two sentences on what happened, for the admin."),
});

function buildSystemPrompt(seasonNumber, cast) {
  const scoring = SEASON_SCORING[seasonNumber] ?? SEASON_SCORING[51];
  const scoring_lines = EVENT_TYPES.filter((t) => scoring[t] !== 0)
    .map((t) => `  ${t}: ${scoring[t] > 0 ? "+" : ""}${scoring[t]}`)
    .join("\n");
  const zeroed = EVENT_TYPES.filter((t) => scoring[t] === 0);

  return `You draft fantasy-league scoring for CBS's Survivor, season ${seasonNumber}.

A league admin reviews everything you produce before it counts. Your job is to
save them transcription work, NOT to be decisive. An honest "I could not tell"
is far more useful than a plausible guess — a wrong event silently changes
every player's standings.

SCORING EVENTS THAT COUNT THIS SEASON
${scoring_lines}

Do not emit these — they are worth 0 points in season ${seasonNumber}:
${zeroed.length ? zeroed.join(", ") : "(none)"}

CONFIDENCE
Recaps state these plainly; use "high" only when a source says so directly:
${RELIABLE.join(", ")}

These are covered inconsistently because the show hides them on purpose:
found_idol, found_advantage, used_idol_successfully, used_advantage_successfully
Mark them "medium" at best, "low" if you are inferring. If a recap does not
mention an idol at all, emit nothing rather than assuming nobody found one —
say so in the "unresolved" list instead.

RULES
- Only use castawayId values from the cast list. Never invent one.
- voted_at_tribal means votes cast AGAINST that castaway at tribal council;
  count is the number of votes. Only include it if a recap gives a vote tally.
- Omit a castaway entirely if nothing scoreable happened to them.
- Every event needs "evidence" — a short quote or paraphrase from a source.
- If you cannot find a recap of this exact episode, set episodeFound false and
  return empty castaways. Do not extrapolate from a different episode.

CAST (id — name)
${cast.map((c) => `  ${c.id} — ${c.name}`).join("\n")}`;
}

/** Weekday (0=Sun) and hour in America/New_York, DST-aware. */
export function etDayAndHour(at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  })
    .formatToParts(at)
    .reduce((acc, p) => (p.type === "literal" ? acc : { ...acc, [p.type]: p.value }), {});
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: days[parts.weekday], hour: Number(parts.hour) % 24 };
}

/**
 * Is `at` inside the drafting window?
 *
 * Expressed as a start (ET weekday + hour) plus a duration in hours, rather
 * than a start-day/end-day pair. The pair version breaks at midnight: a window
 * starting Thursday 00:00 would match "any hour on Thursday >= 0", i.e. the
 * whole day, plus part of Friday.
 *
 * Default is Thursday 00:00 ET for 12 hours. Midnight is roughly two hours
 * after the episode ends (90-minute episodes finish 9:30pm ET; the premiere
 * runs to 10:00), which is when recaps start landing — but not all of them, so
 * the window stays open through the morning and the caller retries.
 *
 * ET rather than UTC deliberately: Thu midnight ET is 04:00 UTC in summer and
 * 05:00 UTC in winter, so a UTC schedule silently shifts when the clocks change
 * mid-season.
 */
export function inScorerWindow(
  at = new Date(),
  { day = 4, startHour = 0, durationHours = 12 } = {},
) {
  const et = etDayAndHour(at);
  // Hours from the window's opening moment, wrapping across the week.
  const elapsed = (et.day - day + 7) % 7 * 24 + (et.hour - startHour);
  const normalized = ((elapsed % (7 * 24)) + 7 * 24) % (7 * 24);
  return normalized < durationHours;
}

/**
 * Ask Claude to read recaps and draft the episode.
 * Returns the parsed draft, or null if the model produced nothing usable.
 */
export async function draftEpisode({ seasonNumber, episodeNumber, cast, apiKey }) {
  const client = new Anthropic(apiKey ? { apiKey } : {});

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { format: zodOutputFormat(DraftSchema) },
    system: buildSystemPrompt(seasonNumber, cast),
    // Dynamic-filtering web tools. Do NOT also declare code_execution — these
    // run it internally, and a second environment confuses the model.
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: 8 },
      { type: "web_fetch_20260209", name: "web_fetch", max_uses: 5 },
    ],
    messages: [
      {
        role: "user",
        content:
          `Find recaps of Survivor season ${seasonNumber}, episode ${episodeNumber}, ` +
          `and draft its scoring. Cross-check at least two independent sources ` +
          `before marking anything "high" confidence. If the episode has not aired ` +
          `or no recap exists yet, say so rather than guessing.`,
      },
    ],
  });

  return response.parsed_output ?? null;
}

/**
 * The episode the admin would be scoring next: the first gap starting at 1.
 * Mirrors nextEpisodeNumber in src/app/dashboard/admin/scores/page.tsx — the
 * draft must land on the episode the form will open to.
 */
export function nextEpisodeNumber(castawayDocs) {
  const withData = new Set();
  for (const c of castawayDocs) {
    for (const [ep, events] of Object.entries(c.weeklyEvents ?? {})) {
      if (Array.isArray(events) && events.length > 0) withData.add(parseInt(ep, 10));
    }
  }
  let next = 1;
  while (withData.has(next)) next++;
  return next;
}

/**
 * Generate and store a draft for the next unscored episode.
 * Returns a short result object for logging. Never throws past its own catch.
 */
export async function runEpisodeDraft(db, {
  seasonNumber,
  force = false,
  apiKey,
  /** Re-attempt when a previous run found no recap (it may have posted since). */
  retryNotFound = false,
  maxAttempts = 12,
}) {
  const castCol = db.collection("seasons").doc(String(seasonNumber)).collection("castaways");
  const castSnap = await castCol.get();
  if (castSnap.empty) return { ok: false, reason: "no cast for season" };

  const cast = castSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const episodeNumber = nextEpisodeNumber(cast);

  const draftRef = db
    .collection("seasons").doc(String(seasonNumber))
    .collection("pendingScores").doc(String(episodeNumber));

  const existing = await draftRef.get();
  if (!force && existing.exists) {
    const status = existing.get("status");
    const attempts = existing.get("attempts") ?? 1;
    // A finished draft ends the week. A "not_found" one usually just means the
    // recap hadn't been published yet, so retry while the window is open —
    // bounded, so a genuinely missing episode can't loop all night.
    const retryable = retryNotFound && status === "not_found" && attempts < maxAttempts;
    if (!retryable) {
      return { ok: true, skipped: true, episodeNumber, reason: `draft exists (${status})` };
    }
  }
  const priorAttempts = existing.exists ? (existing.get("attempts") ?? 1) : 0;

  let draft;
  try {
    draft = await draftEpisode({ seasonNumber, episodeNumber, cast, apiKey });
  } catch (err) {
    console.error("[scorer] Claude call failed:", err.message);
    return { ok: false, episodeNumber, reason: err.message };
  }

  if (!draft) return { ok: false, episodeNumber, reason: "no parsable output" };

  if (!draft.episodeFound) {
    // Store the miss so the loop doesn't retry all day, and so the admin can
    // see it was attempted rather than silently skipped.
    const attempts = priorAttempts + 1;
    await draftRef.set({
      seasonNumber, episodeNumber, status: "not_found", attempts,
      summary: draft.summary ?? "", unresolved: draft.unresolved ?? [],
      sources: [], castaways: [], generatedAt: Timestamp.now(), model: "claude-opus-5",
    });
    return { ok: true, episodeNumber, found: false, attempts };
  }

  // Drop anything referencing a castaway that isn't in this season's cast.
  const validIds = new Set(cast.map((c) => c.id));
  const rejected = draft.castaways.filter((c) => !validIds.has(c.castawayId));
  const castaways = draft.castaways.filter((c) => validIds.has(c.castawayId));

  await draftRef.set({
    seasonNumber,
    episodeNumber,
    status: "ready",
    attempts: priorAttempts + 1,
    episodeTitle: draft.episodeTitle ?? null,
    airDate: draft.airDate ?? null,
    summary: draft.summary ?? "",
    sources: draft.sources ?? [],
    castaways,
    unresolved: [
      ...(draft.unresolved ?? []),
      ...rejected.map((c) => `Dropped unknown castaway id "${c.castawayId}" (${c.castawayName}).`),
    ],
    generatedAt: Timestamp.now(),
    model: "claude-opus-5",
  });

  const lowConfidence = castaways
    .flatMap((c) => c.events)
    .filter((e) => e.confidence !== "high").length;

  return {
    ok: true, episodeNumber, found: true,
    castaways: castaways.length, lowConfidence, rejected: rejected.length,
  };
}
