/**
 * Season metadata and archive structure.
 *
 * In the future, completed seasons will be archived and marked as inactive.
 * The current/upcoming season is always used for new leagues.
 */

export interface Season {
  number: number;
  name: string;
  theme: string;
  premiereDate: string; // ISO 8601 format: YYYY-MM-DD
  isActive: boolean;
}

// Current/upcoming season for new leagues
export const CURRENT_SEASON: Season = {
  number: 50,
  name: "Survivor 50",
  theme: "In the Hands of the Fans",
  premiereDate: "2026-02-25",
  isActive: true,
};

// Past seasons (archived, kept for historical data)
const ARCHIVED_SEASONS: Season[] = [
  // Add archived seasons here as they complete
  // {
  //   number: 49,
  //   name: 'Survivor 49',
  //   theme: '',
  //   premiereDate: '2024-09-24',
  //   isActive: false,
  // },
];

// All seasons combined
export const ALL_SEASONS: Season[] = [CURRENT_SEASON, ...ARCHIVED_SEASONS];

// Get the current active season
export const getCurrentSeason = (): Season => {
  const activeSeason = ALL_SEASONS.find((s) => s.isActive);
  return activeSeason || CURRENT_SEASON;
};

export default CURRENT_SEASON;
