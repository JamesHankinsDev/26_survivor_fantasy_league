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
  displayName: string; // Editable tribe/display name
  ownerName?: string; // Original auth user name (immutable after join)
  avatar: string; // URL to avatar image
  tribeColor: string; // Hex color for tribe
  totalPoints: number; // Sum of all weeklyRoster weekScores
  joinedAt: Date | any;
  roster: string[]; // Current working roster — array of castaway IDs (max 5)
  weeklyRosters: WeeklyRoster[]; // Locked snapshots — source of truth for scoring
  draftedAt?: Date | any; // When the tribe drafted their initial roster
  /**
   * The starter-pack hand dealt to this member at draft time (castaway IDs).
   * Persisted on first pack-open so the deal is stable — a refresh can never
   * reroll it. Empty/absent until the member opens their draft pack.
   */
  dealtHand?: string[];
  dealtAt?: Date | any; // When the starter pack was first dealt
}

// League data model and types
export type ProposalVote = "yay" | "nay";
export type ProposalOutcome = "adopted" | "rejected";

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
  /** Survivor season this league is playing. Legacy leagues default to 50 via normalizer. */
  seasonNumber: number;
  /** Per-proposal vote tracking: proposalSlug -> userId -> yay/nay. */
  proposalVotes?: Record<string, Record<string, ProposalVote>>;
  /** Per-proposal outcome set by the league owner once voting concludes. */
  proposalOutcomes?: Record<
    string,
    { outcome: ProposalOutcome; decidedAt: Date | any; decidedBy: string }
  >;
  /**
   * Snapshots of prior seasons this league has played. Written by the
   * "Adopt new season" carry-over flow before resetting member rosters.
   * Keyed by the old seasonNumber as a string (Firestore-friendly).
   */
  seasonArchive?: Record<string, ArchivedSeason>;
}

/** A frozen record of one season's final state for a league. */
export interface ArchivedSeason {
  seasonNumber: number;
  archivedAt: Date | any;
  /** Final standings — every member's totalPoints, weeklyRosters, and roster
   * at the moment the new season was adopted. */
  memberDetails: TribeMember[];
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
  | "found_advantage"
  | "used_idol_successfully"
  | "used_advantage_successfully"
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

/**
 * Assign ranks to a sorted-by-points array of members, handling ties.
 * Members with the same totalPoints receive the same rank number.
 * The next rank after a tie skips ahead (e.g. 1, T-2, T-2, 4).
 *
 * Generic over T so extra properties (e.g. castawayPoints from ComputedMember)
 * are preserved on the returned objects.
 */
/** Trend direction compared to the previous week's rank */
export type RankTrend = "up" | "down" | "same" | "new";

export type RankedMember<T extends TribeMember = TribeMember> = T & {
  rank: number;
  isTied: boolean;
  trend: RankTrend;
  /** How many positions the rank moved (positive = improved) */
  trendDelta: number;
};

export const assignRanks = <T extends TribeMember>(members: T[]): RankedMember<T>[] => {
  const sorted = [...members].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

  // First pass: assign ranks (tied members share the same rank)
  const ranked: RankedMember<T>[] = sorted.map((member, idx) => {
    const rank =
      idx === 0 || (sorted[idx - 1].totalPoints || 0) !== (member.totalPoints || 0)
        ? idx + 1
        : (undefined as unknown as number); // placeholder, filled below
    return { ...member, rank, isTied: false, trend: "new" as RankTrend, trendDelta: 0 };
  });

  // Fill in tied ranks from the previous non-tied entry
  for (let i = 1; i < ranked.length; i++) {
    if (ranked[i].rank === undefined || isNaN(ranked[i].rank)) {
      ranked[i].rank = ranked[i - 1].rank;
    }
  }

  // Second pass: mark ties (any rank that appears more than once)
  const rankCounts = new Map<number, number>();
  for (const m of ranked) {
    rankCounts.set(m.rank, (rankCounts.get(m.rank) || 0) + 1);
  }
  for (const m of ranked) {
    m.isTied = (rankCounts.get(m.rank) || 0) > 1;
  }

  return ranked;
};

/**
 * Enrich ranked members with trend data by comparing current ranks to
 * what ranks would have been using only points up to the previous week.
 *
 * Members with no weekly rosters or only one week of data get trend "new".
 */
export const withRankTrends = <T extends TribeMember>(
  rankedMembers: RankedMember<T>[],
): RankedMember<T>[] => {
  // Find the latest week number across all members
  let maxWeek = 0;
  for (const m of rankedMembers) {
    for (const wr of m.weeklyRosters || []) {
      if (wr.week > maxWeek) maxWeek = wr.week;
    }
  }

  // If nobody has more than one week of data, trends are all "new"
  if (maxWeek <= 1) return rankedMembers;

  // Build "previous" members with totalPoints excluding the latest week's score.
  // We use the live-computed totalPoints and subtract the latest week's contribution.
  const previousMembers: TribeMember[] = rankedMembers.map((m) => {
    const weeklyRosters = m.weeklyRosters || [];
    const latestRoster = weeklyRosters.find((wr) => wr.week === maxWeek);
    // Subtract the latest week's score from the live total
    const latestWeekScore = latestRoster?.weekScore || 0;
    // If the live total was computed from episode data the weekScore field
    // may be stale (0) — fall back to computing the delta from episode scores.
    // Since we don't have episode data here we use weekScore as the best proxy.
    const previousTotal = (m.totalPoints || 0) - latestWeekScore;
    return { ...m, totalPoints: Math.max(0, previousTotal) };
  });

  const previousRanked = assignRanks(previousMembers);
  const previousRankMap = new Map<string, number>();
  for (const pm of previousRanked) {
    previousRankMap.set(pm.userId, pm.rank);
  }

  return rankedMembers.map((m) => {
    const prevRank = previousRankMap.get(m.userId);
    if (prevRank === undefined) {
      return { ...m, trend: "new" as RankTrend, trendDelta: 0 };
    }
    const delta = prevRank - m.rank; // positive = improved (lower rank number)
    const trend: RankTrend = delta > 0 ? "up" : delta < 0 ? "down" : "same";
    return { ...m, trend, trendDelta: delta };
  });
};

// Helper to get member rank in league (1st place, 2nd place, etc)
export const getMemberRank = (
  members: TribeMember[],
  userId: string,
): number => {
  const ranked = assignRanks(members);
  return ranked.find((m) => m.userId === userId)?.rank || 0;
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
