/**
 * Season metadata.
 *
 * All seasons live in a single SEASONS list and carry their own lifecycle flags
 * (`isActive`, `concludedAt`). Derived helpers project them into the home page's
 * "current / past / future" buckets without needing separate constants.
 */

export interface Season {
  number: number;
  name: string;
  theme: string;
  premiereDate: string; // ISO 8601 format: YYYY-MM-DD
  isActive: boolean;
  /** Set when the season's finale has aired and final scores are entered. */
  concludedAt?: string; // ISO 8601 format: YYYY-MM-DD
  /** Week the merge aired — used by the season recap to gate "biggest climber" math. */
  mergeWeek?: number;
}

/**
 * Authoritative list of every season the app knows about.
 *
 * Conventions:
 *   - past:    isActive=false AND concludedAt set
 *   - current: isActive=true
 *   - future:  isActive=false AND no concludedAt (premiereDate may be in the future)
 */
const SEASONS: Season[] = [
  {
    number: 50,
    name: "Survivor 50",
    theme: "In the Hands of the Fans",
    premiereDate: "2026-02-25",
    isActive: false,
    concludedAt: "2026-05-20",
    mergeWeek: 7,
  },
  {
    number: 51,
    name: "Survivor 51",
    theme: "To be revealed",
    premiereDate: "2026-09-23",
    isActive: false,
  },
];

/** All known seasons (past, present, future). */
export const ALL_SEASONS: Season[] = SEASONS;

/**
 * The "focus" season used by castaway / league lookups across the app.
 *
 * Resolves to the currently-active season; falls back to the most recent
 * concluded season so archived leagues continue to resolve their castaway data
 * between seasons.
 */
export const CURRENT_SEASON: Season =
  SEASONS.find((s) => s.isActive) ??
  [...SEASONS]
    .filter((s) => s.concludedAt)
    .sort((a, b) => b.number - a.number)[0] ??
  SEASONS[0];

/** Whether the displayed season is still in play. False once the finale has aired. */
export const isSeasonActive = (season: Season = CURRENT_SEASON): boolean =>
  season.isActive;

/** Display name for a season number — uses metadata if known, otherwise `Survivor N`. */
export const getSeasonLabel = (seasonNumber: number): string => {
  const match = ALL_SEASONS.find((s) => s.number === seasonNumber);
  return match?.name ?? `Survivor ${seasonNumber}`;
};

export type SeasonStatus = "current" | "past" | "future";

/** Project a season into the home page's lifecycle bucket. */
export const getSeasonStatus = (season: Season): SeasonStatus => {
  if (season.isActive) return "current";
  if (season.concludedAt) return "past";
  return "future";
};

/** All seasons in a given lifecycle bucket. */
export const getSeasonsByStatus = (status: SeasonStatus): Season[] =>
  ALL_SEASONS.filter((s) => getSeasonStatus(s) === status);

/** The current active season, or CURRENT_SEASON as fallback. */
export const getCurrentSeason = (): Season => CURRENT_SEASON;

/**
 * Editable subset of Season metadata, mirrored to `seasonOverrides/{N}`.
 * Anything left unset falls back to the static value from SEASONS.
 */
export interface SeasonOverride {
  name?: string;
  theme?: string;
  premiereDate?: string;
  isActive?: boolean;
  concludedAt?: string | null;
  mergeWeek?: number | null;
}

/** Merge a Firestore override on top of a static season, dropping undefined/null. */
export const mergeSeasonOverride = (
  base: Season,
  override: SeasonOverride | null | undefined,
): Season => {
  if (!override) return base;
  const merged: Season = { ...base };
  // String fields: replace if non-empty
  if (typeof override.name === "string" && override.name.length > 0) merged.name = override.name;
  if (typeof override.theme === "string") merged.theme = override.theme;
  if (typeof override.premiereDate === "string") merged.premiereDate = override.premiereDate;
  if (typeof override.isActive === "boolean") merged.isActive = override.isActive;
  // Nullable fields: explicit null clears, undefined ignores
  if (override.concludedAt === null) delete (merged as Partial<Season>).concludedAt;
  else if (typeof override.concludedAt === "string") merged.concludedAt = override.concludedAt;
  if (override.mergeWeek === null) delete (merged as Partial<Season>).mergeWeek;
  else if (typeof override.mergeWeek === "number") merged.mergeWeek = override.mergeWeek;
  return merged;
};

/** Apply a map of overrides (keyed by season number) to every static season. */
export const applySeasonOverrides = (
  overrides: Record<number, SeasonOverride>,
): Season[] => ALL_SEASONS.map((s) => mergeSeasonOverride(s, overrides[s.number]));

/** Pick the current season from a list using the same logic as the static CURRENT_SEASON. */
export const pickCurrentSeason = (seasons: Season[]): Season =>
  seasons.find((s) => s.isActive) ??
  [...seasons].filter((s) => s.concludedAt).sort((a, b) => b.number - a.number)[0] ??
  seasons[0];

export default CURRENT_SEASON;
