"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Box } from "@mui/material";
import {
  assignRanks,
  withRankTrends,
  type League,
  type TribeMember,
  type RankedMember,
} from "@/types/league";
import { useSeasonCastaways, useEliminatedCastaways } from "@/hooks/useCastaways";
import type { Castaway } from "@/types/castaway";
import { useAuth } from "@/lib/auth-context";
import {
  pickCurrentSeason,
  type Season,
  getSeasonStatus,
} from "@/data/seasons";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import PointBadge from "@/components/primitives/PointBadge";
import SectionHeader from "@/components/primitives/SectionHeader";
import { CardHand, SwapSheet } from "@/components/cards";
import StatStrip from "./StatStrip";
import { useRosterSwap } from "@/hooks/useRosterSwap";
import { getLatestLockedRoster } from "@/utils/scoring";
import { getRosterRules } from "@/utils/rosterRules";
import { getCurrentWeek } from "@/utils/week";
import DashHero from "./DashHero";
import ThisWeekCard from "./ThisWeekCard";
import PowerMovers from "./PowerMovers";
import type { PowerMoverData } from "./PowerMover";
import NextEpisodeTile from "./NextEpisodeTile";
import { formatSeasonDate } from "@/utils/seasonDates";

interface ActiveDashboardViewProps {
  league: League;
}

const initialsFor = (name: string): string =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

/**
 * Single-league focused dashboard introduced in Phase 02.
 *
 * Composes the new hero / stat strip / fanned roster / power-movers grid /
 * sidebar tiles around the user's currently-selected league. Renders both
 * pre-season (premiere countdown hero) and in-season variants based on the
 * resolved league's season status.
 */
export default function ActiveDashboardView({ league }: ActiveDashboardViewProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { seasons } = useSeasonsWithOverrides();
  const { data: castaways = [] } = useSeasonCastaways(league.seasonNumber);
  const { data: eliminatedIds = [] } = useEliminatedCastaways(league.seasonNumber);

  const season = useMemo<Season>(() => {
    const match = seasons.find((s) => s.number === league.seasonNumber);
    return match ?? pickCurrentSeason(seasons);
  }, [seasons, league.seasonNumber]);

  const status = getSeasonStatus(season);
  const isPreSeason = status === "future";
  const isInSeason = status === "current";

  const eliminatedSet = useMemo(() => new Set(eliminatedIds), [eliminatedIds]);
  const castawayById = useMemo(() => {
    const map = new Map<string, Castaway>();
    for (const c of castaways) map.set(c.id, c);
    return map;
  }, [castaways]);

  // Rank every member of the league, with trend arrows derived from
  // weeklyRosters[].weekScore. Falls back to flat rankings when no weeks exist.
  const ranked = useMemo<RankedMember<TribeMember>[]>(
    () => withRankTrends(assignRanks(league.memberDetails ?? [])),
    [league.memberDetails],
  );

  // This week's score per member = latest weeklyRoster.weekScore. Members with
  // no scored weeks yet show 0 (will be common pre-season).
  const weekDeltaByUserId = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of ranked) {
      const latest = (m.weeklyRosters ?? []).reduce<number>((acc, wr) => {
        return wr.week > acc ? wr.week : acc;
      }, 0);
      const score =
        (m.weeklyRosters ?? []).find((wr) => wr.week === latest)?.weekScore ?? 0;
      map.set(m.userId, score);
    }
    return map;
  }, [ranked]);

  const selfRanked = ranked.find((m) => m.userId === user?.uid) ?? null;
  const selfRoster: Castaway[] = useMemo(() => {
    if (!selfRanked) return [];
    return selfRanked.roster
      .map((id) => castawayById.get(id))
      .filter((c): c is Castaway => c != null);
  }, [selfRanked, castawayById]);

  const activeRosterCount = selfRoster.filter(
    (c) => !eliminatedSet.has(c.id),
  ).length;

  // Movers payload — render needs avatar color + initials + this-week's delta.
  const movers: PowerMoverData[] = ranked.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    ownerName: m.ownerName,
    color: m.tribeColor || "var(--flame)",
    initials: initialsFor(m.displayName || m.ownerName || "?"),
    weekDelta: weekDeltaByUserId.get(m.userId) ?? 0,
    totalPoints: m.totalPoints ?? 0,
    rank: m.rank ?? ranked.length,
  }));

  // ── The weekly swap, performed here rather than four screens away ──
  const [swapOpen, setSwapOpen] = useState(false);
  const selfMember = useMemo(
    () => (league.memberDetails ?? []).find((m) => m.userId === user?.uid) ?? null,
    [league.memberDetails, user?.uid],
  );
  // Roster rules in force this week. S51 splits at the merge: 2 swaps and
  // droppable voted-out castaways before it, 1 swap and dead weight after.
  // S51 has no mergeWeek set yet, so everything reads as pre-merge until it's
  // filled in from Admin → Seasons.
  const currentWeek = useMemo(
    () => (season.premiereDate ? getCurrentWeek(new Date(season.premiereDate)) : 0),
    [season.premiereDate],
  );
  const rosterRules = useMemo(
    () => getRosterRules(league.seasonNumber, currentWeek, season.mergeWeek),
    [league.seasonNumber, currentWeek, season.mergeWeek],
  );

  const submitSwap = useRosterSwap(league, selfMember, { rules: rosterRules });

  // Swaps left this week = the allowance minus castaways already added since
  // last week's lock. Mirrors SwapSheet's own gating.
  const swapsLeft = useMemo(() => {
    if (!league.addDropRestrictionEnabled || !selfMember) return null;
    const locked = getLatestLockedRoster(selfMember.weeklyRosters || []);
    if (locked.length === 0) return rosterRules.swapsPerWeek;
    const used = (selfMember.roster ?? []).filter((id) => !locked.includes(id)).length;
    return Math.max(0, rosterRules.swapsPerWeek - used);
  }, [league.addDropRestrictionEnabled, selfMember, rosterRules.swapsPerWeek]);

  const needsDraft = (selfMember?.roster?.length ?? 0) === 0;

  const castawaySeasonScores = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of castaways) map[c.id] = c.totalPoints ?? 0;
    return map;
  }, [castaways]);

  return (
    <Box className="sfl-page">
      {/* THE WEEKLY MOVE — first thing on the page, in-season.
       *
       * The in-season DashHero used to sit here and said much of what
       * ThisWeekCard now says (lock time, member count, eliminations) plus a
       * "Set lineup" CTA that only navigated somewhere else. Its lede also
       * hardcoded "One add/drop remaining this week" whether or not one was
       * actually left. Pre-season the hero still earns its place: a premiere
       * countdown is the whole message. */}
      {isPreSeason ? (
        <DashHero
          mode="pre-season"
          season={season}
          primaryAction={{
            label: "Set lineup",
            href: `/dashboard/my-leagues/${league.id}`,
          }}
          secondaryAction={{ label: "View cast", href: "/dashboard/castaways" }}
        />
      ) : (
        selfMember && (
          <ThisWeekCard
            rank={selfRanked?.rank ?? null}
            totalMembers={ranked.length}
            totalPoints={selfRanked?.totalPoints ?? 0}
            weekDelta={weekDeltaByUserId.get(selfMember.userId) ?? 0}
            roster={selfRoster}
            eliminatedIds={eliminatedSet}
            swapsLeft={swapsLeft}
            onSwap={() => setSwapOpen(true)}
            needsDraft={needsDraft}
            // The starter-pack reveal lives on the league page.
            onDraft={() => router.push(`/dashboard/my-leagues/${league.id}`)}
          />
        )
      )}

      {/* The stat strip that stood here restated rank / total / active from
       * ThisWeekCard directly above it, plus a fourth "Win streak — coming
       * soon" cell that never had data behind it. Pre-season keeps a trimmed
       * version, since there's no ThisWeekCard then. */}
      {isPreSeason && selfRanked && (
        <StatStrip
          cells={[
            {
              value: (
                <>
                  <span className="sfl-mono">#{selfRanked.rank ?? "\u2014"}</span>
                  {selfRanked.trendDelta !== 0 && (
                    <PointBadge
                      value={selfRanked.trendDelta}
                      trend={selfRanked.trendDelta > 0 ? "up" : "down"}
                    />
                  )}
                </>
              ),
              label: "League rank",
              sub: `of ${ranked.length} tribes \u00b7 ${league.name}`,
            },
            {
              value: <span className="sfl-mono">{selfRanked.totalPoints ?? 0}</span>,
              label: "Total points",
              sub: "Pre-season",
            },
            {
              value: (
                <span className="sfl-mono">
                  {activeRosterCount}/{selfRoster.length || 5}
                </span>
              ),
              label: "Active rostered",
              sub:
                eliminatedSet.size > 0
                  ? `${eliminatedSet.size} eliminated overall`
                  : "No eliminations yet",
            },
          ]}
        />
      )}

      {/* MAIN + SIDE GRID */}
      <div className="sfl-dash-grid">
        <section className="sfl-dash-col main">
          <SectionHeader
            eyebrow={`Your tribe · ${selfRoster.length} of 5 in hand`}
            title={selfRanked?.displayName || "Set up your tribe"}
            action={
              /* Was two links to the identical URL ("Manage roster" and
               * "Add / drop"). Add/drop is the CTA on ThisWeekCard now. */
              <a
                className="sfl-btn-tiny"
                href={`/dashboard/my-leagues/${league.id}`}
              >
                Open league
              </a>
            }
          />
          <CardHand
            castaways={selfRoster}
            slots={5}
            size="sm"
          />

          <SectionHeader
            eyebrow="This week"
            title="Power movers"
            action={
              <a className="sfl-btn-tiny" href="/dashboard/leaderboard">
                Full standings →
              </a>
            }
          />
          <PowerMovers movers={movers} selfUserId={user?.uid} />
        </section>

        <aside className="sfl-dash-col side">
          {/* LeagueChatMini stood here permanently empty — it was passed
           * `messages={[]}` and a no-op open handler, so it advertised a
           * conversation and then did nothing when tapped. The message board
           * is reachable from the league page and the chat FAB. */}
          <NextEpisodeTile
            title={
              isPreSeason
                ? `${season.name} premieres`
                : "Next episode airs Wednesday"
            }
            when={
              isPreSeason
                ? formatSeasonDate(season.premiereDate, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Wed 8pm ET · CBS"
            }
            stats={
              isInSeason
                ? [
                    {
                      label: "Castaways",
                      value: `${(castaways.length || 0) - eliminatedSet.size}`,
                    },
                    { label: "Eliminated", value: `${eliminatedSet.size}` },
                    { label: "Total cast", value: `${castaways.length || 0}` },
                  ]
                : [
                    { label: "Cast reveal", value: "Soon" },
                    { label: "Season", value: `S${season.number}` },
                    {
                      label: "Status",
                      value: isPreSeason ? "Upcoming" : "—",
                    },
                  ]
            }
            cta={{ label: "Episode log", href: "/dashboard/leaderboard" }}
          />
        </aside>
      </div>

      {/* The swap sheet opens over Home — the dashboard never unmounts, so
       * closing it returns the player exactly where they were. */}
      {selfMember && (
        <SwapSheet
          open={swapOpen}
          onClose={() => setSwapOpen(false)}
          onSubmit={submitSwap}
          tribeMember={selfMember}
          allCastaways={castaways}
          eliminatedCastawayIds={eliminatedIds}
          seasonStartDate={
            season.premiereDate ? new Date(season.premiereDate) : new Date()
          }
          castawaySeasonScores={castawaySeasonScores}
          addDropRestrictionEnabled={league.addDropRestrictionEnabled ?? false}
          seasonNumber={league.seasonNumber}
          rules={rosterRules}
        />
      )}
    </Box>
  );
}
