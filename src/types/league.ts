// Roster entry for a castaway on a tribe
export interface RosterEntry {
  castawayId: string;
  status: "active" | "dropped" | "eliminated"; // active: on team, dropped: manually removed, eliminated: voted out
  addedWeek: number; // Week castaway was added (0 = draft, 1+ = add/drop week)
  droppedWeek?: number; // Week castaway was dropped (undefined if still active or eliminated)
  accumulatedPoints: number; // Total points earned while on this team
}

// Member/Tribe data
export interface TribeMember {
  userId: string;
  displayName: string;
  avatar: string; // URL to avatar image
  tribeColor: string; // Hex color for tribe
  points: number;
  joinedAt: Date | any;
  roster: RosterEntry[]; // Roster of 5 (or 4 if dropped) castaways
  draftedAt?: Date | any; // When the tribe drafted their initial roster
}

// League data model and types
export interface League {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  maxPlayers: number;
  currentPlayers: number;
  joinCode: string;
  members: string[]; // Array of user IDs (legacy, kept for backward compat)
  memberDetails: TribeMember[]; // New: detailed member info with tribe data
  createdAt: Date | any;
  updatedAt: Date | any;
  status: "active" | "archived";
}

export interface LeagueInvite {
  leagueId: string;
  leagueName: string;
  ownerName: string;
  joinCode: string;
  maxPlayers: number;
}

// Scoring: Weekly episode scores for castaways
export interface EpisodeScores {
  id: string; // e.g., "episode-1"
  seasonNumber: number;
  episodeNumber: number;
  airDate: Date | any;
  scores: Record<string, number>; // { castawayId: points }
  createdAt: Date | any;
  updatedAt: Date | any;
}

// Scoring: Accumulated seasonal stats per castaway
export interface CastawaySeasonStats {
  castawayId: string;
  seasonNumber: number;
  totalPoints: number;
  pointBreakdown: {
    aliveBonus: number;
    immunityWins: number;
    juryVotes: number;
    placementBonus: number;
    other: number;
  };
  lastUpdated: Date | any;
}

// Event-based scoring: individual events recorded per castaway per episode
export type ScoringEventType =
  | "immunity_win"
  | "team_challenge_win"
  | "found_idol"
  | "used_idol_successfully"
  | "voted_at_tribal"
  | "survived_episode"
  | "fire_making_win"
  | "made_final_three"
  | "season_winner"
  | "made_jury"
  | "voted_out";

export interface ScoringEvent {
  eventType: ScoringEventType;
  count: number; // Number of times this event occurred (e.g., 2 jury votes)
}

// Episode events: records all events for all castaways in an episode
export interface EpisodeEvents {
  id: string; // e.g., "episode-1"
  seasonNumber: number;
  episodeNumber: number;
  airDate: Date | any;
  events: Record<string, ScoringEvent[]>; // { castawayId: [ScoringEvent[], ...] }
  createdAt: Date | any;
  updatedAt: Date | any;
}

// Helper to get member rank in league (1st place, 2nd place, etc)
export const getMemberRank = (
  members: TribeMember[],
  userId: string
): number => {
  const sorted = [...members].sort((a, b) => b.points - a.points);
  return sorted.findIndex((m) => m.userId === userId) + 1;
};

// Generate a unique join code (6-character alphanumeric)
export const generateJoinCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate a Firestore-friendly league ID
export const generateLeagueId = (): string => {
  return `league_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get the join URL for a league
export const getLeagueJoinUrl = (joinCode: string): string => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/join/${joinCode}`;
};
