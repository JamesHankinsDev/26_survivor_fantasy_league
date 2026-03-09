// Weekly roster snapshot — locked every Wednesday at 8 PM ET
export interface WeeklyRoster {
  week: number; // Week number (1 = premiere/scouting, 2+ = scoring weeks)
  castawayIds: string[]; // The castaways rostered for this week ([] for week 1)
  weekScore: number; // Points earned this week from rostered castaways
  lockedAt: Date | any; // When this snapshot was taken
}

// Member/Tribe data
export interface TribeMember {
  userId: string;
  displayName: string;
  avatar: string; // URL to avatar image
  tribeColor: string; // Hex color for tribe
  totalPoints: number; // Sum of all weeklyRoster weekScores
  joinedAt: Date | any;
  roster: string[]; // Current working roster — array of castaway IDs (max 5)
  weeklyRosters: WeeklyRoster[]; // Locked snapshots — source of truth for scoring
  draftedAt?: Date | any; // When the tribe drafted their initial roster
}

// League data model and types
export interface League {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  maxPlayers: number;
  currentPlayers: number;
  joinCode: string;
  members: string[]; // Array of user IDs (for Firestore rule checks)
  memberDetails: TribeMember[]; // Detailed member info with tribe data
  createdAt: Date | any;
  updatedAt: Date | any;
  status: "active" | "archived";
  addDropRestrictionEnabled?: boolean; // Admin can toggle add/drop restriction
  leagueStartDate?: string; // ISO string
}

export interface LeagueInvite {
  leagueId: string;
  leagueName: string;
  ownerName: string;
  joinCode: string;
  maxPlayers: number;
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

// Message Board: Messages posted in a league
export interface LeagueMessage {
  id: string;
  leagueId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  mentions: MessageMention[]; // Tags of users or tribes
  createdAt: Date | any;
  updatedAt?: Date | any;
  isEdited: boolean;
  editHistory?: MessageEdit[];
  reactions: MessageReaction[];
  replyCount?: number;
  parentMessageId?: string;
}

export interface MessageMention {
  type: "user" | "tribe";
  id: string; // userId or tribeName
  name: string; // Display name
  startIndex: number; // Position in content where mention starts
  endIndex: number; // Position in content where mention ends
}

export interface MessageEdit {
  editedAt: Date | any;
  previousContent: string;
}

// Helper to get member rank in league (1st place, 2nd place, etc)
export const getMemberRank = (
  members: TribeMember[],
  userId: string,
): number => {
  const sorted = [...members].sort((a, b) => b.totalPoints - a.totalPoints);
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

export type NotificationType =
  | "score_update"
  | "mention"
  | "league_invite"
  | "elimination"
  | "new_message"
  | "rank_change";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: Date | any;
  metadata?: {
    leagueId?: string;
    leagueName?: string;
    messageId?: string;
    points?: number;
    rank?: number;
    mentionedBy?: string;
  };
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: Date | any;
}

export const REACTION_EMOJIS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "🎯", label: "Bullseye" },
  { emoji: "👀", label: "Eyes" },
] as const;
