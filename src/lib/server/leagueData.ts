/**
 * Server-side league data access for the AI assistant routes.
 *
 * Everything here runs with the admin SDK, which bypasses `firestore.rules` —
 * so every loader takes the caller's verified `uid` and refuses leagues they
 * aren't a member of. Never pass a client-supplied user ID in here.
 */
import "server-only";
import type { NextRequest } from "next/server";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminAuth } from "@/lib/firebase-admin";
import { applySeasonOverrides, type Season, type SeasonOverride } from "@/data/seasons";
import type { Castaway } from "@/types/castaway";
import type { League, TribeMember } from "@/types/league";
import { normalizeMember } from "@/utils/normalizeMember";
import { getRosterRules, type RosterRules } from "@/utils/rosterRules";
import type { RosterSwapContext } from "@/utils/rosterSwap";
import { getCurrentWeek } from "@/utils/week";
import { apiLogger } from "@/lib/logger";

/** Verify the `Authorization: Bearer <Firebase ID token>` header. */
export async function getRequestUid(request: NextRequest): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice("Bearer ".length));
    return decoded.uid;
  } catch (err) {
    apiLogger.warn("Rejected ID token", err);
    return null;
  }
}

export class LeagueAccessError extends Error {}

export interface LeagueWithMember {
  league: League;
  member: TribeMember;
}

export interface SeasonState {
  season: Season;
  currentWeek: number;
  started: boolean;
  rules: RosterRules;
}

/**
 * Per-request loader that memoizes reads, so a chat turn that calls several
 * tools doesn't re-read the same league or castaway collection.
 */
export class LeagueDataSource {
  private seasonsP: Promise<Season[]> | null = null;
  private leaguesP: Promise<League[]> | null = null;
  private castawaysP = new Map<number, Promise<Castaway[]>>();

  constructor(
    private readonly db: Firestore,
    readonly uid: string,
  ) {}

  seasons(): Promise<Season[]> {
    this.seasonsP ??= this.db
      .collection("seasonOverrides")
      .get()
      .then((snap) => {
        const overrides: Record<number, SeasonOverride> = {};
        snap.forEach((d) => {
          const n = parseInt(d.id, 10);
          if (!Number.isNaN(n)) overrides[n] = d.data() as SeasonOverride;
        });
        return applySeasonOverrides(overrides);
      });
    return this.seasonsP;
  }

  /** Leagues the caller belongs to. `members` array-contains is a single-field index. */
  leagues(): Promise<League[]> {
    this.leaguesP ??= this.db
      .collection("leagues")
      .where("members", "array-contains", this.uid)
      .get()
      .then((snap) => snap.docs.map((d) => normalizeLeague(d.id, d.data())));
    return this.leaguesP;
  }

  async leagueForUser(leagueId: string): Promise<LeagueWithMember> {
    const league = (await this.leagues()).find((l) => l.id === leagueId);
    const member = league?.memberDetails.find((m) => m.userId === this.uid);
    if (!league || !member) {
      throw new LeagueAccessError("You're not a member of that league.");
    }
    return { league, member };
  }

  castaways(seasonNumber: number): Promise<Castaway[]> {
    let p = this.castawaysP.get(seasonNumber);
    if (!p) {
      p = this.db
        .collection("seasons")
        .doc(String(seasonNumber))
        .collection("castaways")
        .get()
        .then((snap) =>
          snap.docs.map(
            (d) =>
              ({
                id: d.id,
                totalPoints: 0,
                eliminated: false,
                weeklyEvents: {},
                ...d.data(),
              }) as Castaway,
          ),
        );
      this.castawaysP.set(seasonNumber, p);
    }
    return p;
  }

  async seasonState(seasonNumber: number, now = new Date()): Promise<SeasonState> {
    const season = (await this.seasons()).find((s) => s.number === seasonNumber);
    if (!season) throw new Error(`Unknown season ${seasonNumber}`);
    const premiere = new Date(season.premiereDate);
    const currentWeek = getCurrentWeek(premiere);
    return {
      season,
      currentWeek,
      started: now >= premiere,
      rules: getRosterRules(seasonNumber, currentWeek, season.mergeWeek),
    };
  }

  /** Everything `validateRosterSwap` needs for this member. */
  async swapContext(
    league: League,
    member: TribeMember,
  ): Promise<{ ctx: RosterSwapContext; state: SeasonState; castaways: Castaway[] }> {
    const [state, castaways] = await Promise.all([
      this.seasonState(league.seasonNumber),
      this.castaways(league.seasonNumber),
    ]);
    return {
      state,
      castaways,
      ctx: {
        roster: member.roster,
        weeklyRosters: member.weeklyRosters,
        rules: state.rules,
        restrictionEnabled: league.addDropRestrictionEnabled ?? false,
        seasonStarted: state.started,
        seasonCastawayIds: new Set(castaways.map((c) => c.id)),
        eliminatedIds: new Set(castaways.filter((c) => c.eliminated).map((c) => c.id)),
      },
    };
  }
}

/**
 * Swaps are only allowed in active leagues playing the active season — a
 * concluded season's rosters are history.
 */
export function swapBlockedReason(league: League, state: SeasonState): string | null {
  if (league.status !== "active") return "That league is archived.";
  if (!state.season.isActive) return `Season ${state.season.number} isn't active.`;
  return null;
}

export function normalizeLeague(id: string, raw: FirebaseFirestore.DocumentData): League {
  return {
    id,
    ...raw,
    memberDetails: (raw.memberDetails || []).map(normalizeMember),
    // Legacy leagues created before seasonNumber existed all belong to S50.
    seasonNumber: typeof raw.seasonNumber === "number" ? raw.seasonNumber : 50,
  } as League;
}
