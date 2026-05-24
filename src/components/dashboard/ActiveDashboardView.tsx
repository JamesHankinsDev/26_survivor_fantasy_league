"use client";

import { useMemo, useState } from "react";
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
import { CardHand } from "@/components/cards";
import DashHero from "./DashHero";
import StatStrip from "./StatStrip";
import PowerMovers from "./PowerMovers";
import type { PowerMoverData } from "./PowerMover";
import LeagueChatMini from "./LeagueChatMini";
import NextEpisodeTile from "./NextEpisodeTile";

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

  const [chatHandlerNoop] = useState<() => void>(() => () => {
    // Compact preview placeholder; the actual chat drawer is owned by
    // DashboardLayout. Once Phase 07 ships, wire this to open it.
  });

  return (
    <Box className="sfl-page">
      {/* HERO */}
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
        <DashHero
          mode="in-season"
          weekKicker={`${season.name} · in play`}
          episodeTitle={season.theme || "Outwit Outplay Outlast"}
          lede={
            <>
              Your roster locks at <b>Wednesday 8:00 PM ET</b>. One add/drop
              remaining this week — make it count.
            </>
          }
          primaryAction={{
            label: "Set lineup",
            href: `/dashboard/my-leagues/${league.id}`,
          }}
          secondaryAction={{
            label: "Standings",
            href: "/dashboard/leaderboard",
          }}
          totalMembers={league.currentPlayers}
          eliminations={{
            eliminated: eliminatedSet.size,
            total: castaways.length || 0,
          }}
        />
      )}

      {/* STAT STRIP */}
      {selfRanked && (
        <StatStrip
          cells={[
            {
              value: (
                <>
                  <span className="sfl-mono">#{selfRanked.rank ?? "—"}</span>
                  {selfRanked.trendDelta !== 0 && (
                    <PointBadge
                      value={selfRanked.trendDelta}
                      trend={selfRanked.trendDelta > 0 ? "up" : "down"}
                    />
                  )}
                </>
              ),
              label: "League rank",
              sub: `of ${ranked.length} tribes · ${league.name}`,
            },
            {
              value: <span className="sfl-mono">{selfRanked.totalPoints ?? 0}</span>,
              label: "Total points",
              sub: isInSeason ? "Season in play" : "Pre-season",
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
            {
              value: <span className="sfl-mono">—</span>,
              label: "Win streak",
              sub: "Weeks at #1 (coming soon)",
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
              <>
                <a
                  className="sfl-btn-tiny"
                  href={`/dashboard/my-leagues/${league.id}`}
                >
                  Manage roster
                </a>
                <a
                  className="sfl-btn-tiny ghost"
                  href={`/dashboard/my-leagues/${league.id}`}
                >
                  Add / drop
                </a>
              </>
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
          <LeagueChatMini
            leagueName={league.name}
            messages={[]}
            onOpen={chatHandlerNoop}
          />
          <NextEpisodeTile
            title={
              isPreSeason
                ? `${season.name} premieres`
                : "Next episode airs Wednesday"
            }
            when={
              isPreSeason
                ? new Date(season.premiereDate).toLocaleDateString("en-US", {
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
    </Box>
  );
}
