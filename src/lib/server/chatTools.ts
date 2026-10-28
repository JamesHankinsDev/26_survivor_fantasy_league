/**
 * Tools for the AI assistant. Every tool is bound to the caller's verified uid
 * through `LeagueDataSource`, so the model can only ever read leagues the user
 * belongs to and only ever touch the user's own roster.
 *
 * Nothing here writes. `propose_roster_swap` validates a swap and hands it to
 * the client as a confirm card; `/api/roster-swap` applies it on tap.
 */
import "server-only";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { assignRanks } from "@/types/league";
import type { Castaway } from "@/types/castaway";
import type { SwapProposal } from "@/types/chat";
import { getNextRosterLockDate } from "@/utils/lockCountdown";
import { buildEpisodeScoresMap, computeLiveTotal } from "@/utils/liveScores";
import { getSwapsLeft, validateRosterSwap } from "@/utils/rosterSwap";
import { getScoringConfig } from "@/utils/seasonScoringConfig";
import { LeagueDataSource, swapBlockedReason } from "@/lib/server/leagueData";

const leagueId = z.string().min(1).max(128).describe("League ID from list_my_leagues");
const castawayId = z.string().min(1).max(128);

const json = (value: unknown) => JSON.stringify(value);

const formatEt = (d: Date) =>
  d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

const castawaySummary = (c: Castaway) => ({
  id: c.id,
  name: c.name,
  tribe: c.tribe ?? null,
  eliminated: c.eliminated,
  seasonPoints: c.totalPoints ?? 0,
});

export function buildChatTools(
  data: LeagueDataSource,
  onProposal: (proposal: SwapProposal) => void,
) {
  /** Live standings for a league, ranked the same way as the leaderboard. */
  const standings = async (id: string) => {
    const { league } = await data.leagueForUser(id);
    const castaways = await data.castaways(league.seasonNumber);
    const episodeScores = buildEpisodeScoresMap(castaways, league.seasonNumber);
    const members = league.memberDetails.map((m) => ({
      ...m,
      totalPoints: computeLiveTotal(m, episodeScores, league.seasonNumber),
    }));
    return { league, ranked: assignRanks(members) };
  };

  const listMyLeagues = betaZodTool({
    name: "list_my_leagues",
    description:
      "List the leagues the user belongs to, with their rank and points in each. Call this first to get league IDs.",
    inputSchema: z.object({}),
    run: async () => {
      const leagues = await data.leagues();
      const rows = await Promise.all(
        leagues.map(async (l) => {
          const { ranked } = await standings(l.id);
          const me = ranked.find((m) => m.userId === data.uid);
          return {
            leagueId: l.id,
            name: l.name,
            season: l.seasonNumber,
            status: l.status,
            players: ranked.length,
            myTribeName: me?.displayName ?? null,
            myRank: me?.rank ?? null,
            myPoints: me?.totalPoints ?? 0,
          };
        }),
      );
      return json(rows);
    },
  });

  const getStandings = betaZodTool({
    name: "get_league_standings",
    description: "Current leaderboard for a league: every tribe's rank and total points.",
    inputSchema: z.object({ league_id: leagueId }),
    run: async ({ league_id }) => {
      const { league, ranked } = await standings(league_id);
      return json({
        league: league.name,
        season: league.seasonNumber,
        standings: ranked.map((m) => ({
          rank: m.rank,
          tied: m.isTied,
          tribeName: m.displayName,
          player: m.ownerName || m.displayName,
          points: m.totalPoints,
          isMe: m.userId === data.uid,
        })),
      });
    },
  });

  const getMyTribe = betaZodTool({
    name: "get_my_tribe",
    description:
      "The user's current tribe (working roster) in a league, plus this week's swap allowance, roster rules and the next roster lock time.",
    inputSchema: z.object({ league_id: leagueId }),
    run: async ({ league_id }) => {
      const { league, member } = await data.leagueForUser(league_id);
      const { ctx, state, castaways } = await data.swapContext(league, member);
      const byId = new Map(castaways.map((c) => [c.id, c]));
      const { ranked } = await standings(league_id);
      const me = ranked.find((m) => m.userId === data.uid);

      return json({
        league: league.name,
        tribeName: member.displayName,
        rank: me?.rank ?? null,
        points: me?.totalPoints ?? 0,
        roster: member.roster.map((id) => {
          const c = byId.get(id);
          return c ? castawaySummary(c) : { id, name: "Unknown castaway" };
        }),
        hasDrafted: member.roster.length > 0,
        currentWeek: state.currentWeek,
        isPostMerge: state.rules.isPostMerge,
        addDropRestricted: ctx.restrictionEnabled,
        swapsPerWeek: state.rules.swapsPerWeek,
        swapsLeftThisWeek: getSwapsLeft(
          member.roster,
          member.weeklyRosters,
          state.rules,
          ctx.restrictionEnabled,
        ),
        canDropVotedOutCastaways: state.rules.canDropEliminated,
        nextRosterLock: formatEt(getNextRosterLockDate()),
        swapsBlockedReason: swapBlockedReason(league, state),
      });
    },
  });

  const listCastaways = betaZodTool({
    name: "list_castaways",
    description:
      "Every castaway in the league's season with ID, tribe, season points, whether they're voted out, and whether they're on the user's tribe. Use it to find castaway IDs by name.",
    inputSchema: z.object({ league_id: leagueId }),
    run: async ({ league_id }) => {
      const { league, member } = await data.leagueForUser(league_id);
      const castaways = await data.castaways(league.seasonNumber);
      const mine = new Set(member.roster);
      return json(
        [...castaways]
          .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
          .map((c) => ({ ...castawaySummary(c), onMyTribe: mine.has(c.id) })),
      );
    },
  });

  const getCastawayScoring = betaZodTool({
    name: "get_castaway_scoring",
    description: "Episode-by-episode scoring events and points for one castaway.",
    inputSchema: z.object({ league_id: leagueId, castaway_id: castawayId }),
    run: async ({ league_id, castaway_id }) => {
      const { league } = await data.leagueForUser(league_id);
      const castaways = await data.castaways(league.seasonNumber);
      const c = castaways.find((x) => x.id === castaway_id);
      if (!c) throw new Error("No castaway with that ID in this season.");
      const config = getScoringConfig(league.seasonNumber);
      const episodes = Object.entries(c.weeklyEvents || {})
        .map(([ep, events]) => ({
          episode: Number(ep),
          events: events.map((e) => ({
            event: e.eventType,
            count: e.count,
            points: e.count * (config[e.eventType] || 0),
          })),
        }))
        .sort((a, b) => a.episode - b.episode);
      return json({ ...castawaySummary(c), episodes });
    },
  });

  const proposeSwap = betaZodTool({
    name: "propose_roster_swap",
    description:
      "Propose a change to the user's tribe: drop one castaway, add one, or both. This does NOT save anything — it shows the user a confirmation card and they must tap Confirm. Use castaway IDs from list_castaways / get_my_tribe. If it returns an error, explain the rule to the user.",
    inputSchema: z.object({
      league_id: leagueId,
      drop_castaway_id: castawayId.nullable().describe("Castaway to drop, or null"),
      add_castaway_id: castawayId.nullable().describe("Castaway to add, or null"),
    }),
    run: async ({ league_id, drop_castaway_id, add_castaway_id }) => {
      const { league, member } = await data.leagueForUser(league_id);
      const { ctx, state, castaways } = await data.swapContext(league, member);

      const blocked = swapBlockedReason(league, state);
      if (blocked) throw new Error(blocked);

      const result = validateRosterSwap(drop_castaway_id, add_castaway_id, ctx);
      if (!result.ok) throw new Error(result.error);

      const byId = new Map(castaways.map((c) => [c.id, c]));
      const ref = (id: string | null) =>
        id ? { id, name: byId.get(id)?.name ?? id } : null;
      onProposal({
        leagueId: league.id,
        leagueName: league.name,
        drop: ref(drop_castaway_id),
        add: ref(add_castaway_id),
        resultingRoster: result.roster.map((id) => ref(id)!),
      });
      return "A confirmation card is now showing in the chat. The swap is NOT saved until the user taps Confirm — tell them to review and confirm it.";
    },
  });

  return [listMyLeagues, getStandings, getMyTribe, listCastaways, getCastawayScoring, proposeSwap];
}
