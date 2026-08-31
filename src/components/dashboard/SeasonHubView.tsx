"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getSeasonStatus, getSeasonLabel, isTestSeason, type Season } from "@/data/seasons";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import FutureSeasonCard from "@/components/FutureSeasonCard";
import type { League } from "@/types/league";

/**
 * Multi-season hub — extracted from the original `/dashboard/page.tsx`.
 *
 * The page-level orchestrator renders this when the user has no league in a
 * currently-playing season (pre-season + concluded-only states fall here).
 * In-season users see `<ActiveDashboardView />` instead.
 */
export default function SeasonHubView({ leagues }: { leagues: League[] }) {
  const { seasons: allSeasons } = useSeasonsWithOverrides();
  // QA sandboxes are registered only so the Hall of Fame can skip them — they
  // are never a season anyone plays, so keep them out of the hub entirely.
  const seasons = useMemo(
    () => allSeasons.filter((s) => !isTestSeason(s.number)),
    [allSeasons],
  );

  const leaguesBySeason = useMemo(() => {
    const map = new Map<number, League[]>();
    for (const l of leagues) {
      const key = l.seasonNumber ?? 50;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return map;
  }, [leagues]);

  const currentSeasons = seasons.filter((s) => getSeasonStatus(s) === "current");
  const pastSeasons = seasons
    .filter((s) => getSeasonStatus(s) === "past")
    .sort((a, b) => b.number - a.number);
  const futureSeasons = seasons
    .filter((s) => getSeasonStatus(s) === "future")
    .sort((a, b) => a.premiereDate.localeCompare(b.premiereDate));

  const noPastLeagues =
    pastSeasons.length > 0 &&
    pastSeasons.every((s) => (leaguesBySeason.get(s.number) ?? []).length === 0);

  return (
    <div className="sfl-page">
      {/* CURRENT SEASON */}
      <h2 className="sfl-secttitle">Current Season</h2>
      {currentSeasons.length === 0 ? (
        <Notice>
          No season is currently in play.
          {futureSeasons.length > 0
            ? ` Survivor ${futureSeasons[0].number} is on the horizon — see Future Seasons below.`
            : ""}
        </Notice>
      ) : (
        currentSeasons.map((season) => (
          <SeasonBlock
            key={season.number}
            season={season}
            leagues={leaguesBySeason.get(season.number) ?? []}
            emptyMessage="You haven't joined a league for this season yet."
          />
        ))
      )}

      {/* PAST SEASONS */}
      <h2 className="sfl-secttitle" style={{ marginTop: 18 }}>Past Seasons</h2>
      {pastSeasons.length === 0 || noPastLeagues ? (
        <Notice>Your archived leagues will appear here once a season ends.</Notice>
      ) : (
        pastSeasons.map((season) => {
          const userLeagues = leaguesBySeason.get(season.number) ?? [];
          if (userLeagues.length === 0) return null;
          return (
            <SeasonBlock key={season.number} season={season} leagues={userLeagues} emptyMessage="" />
          );
        })
      )}

      {/* FUTURE SEASONS */}
      <h2 className="sfl-secttitle" style={{ marginTop: 18 }}>Future Seasons</h2>
      {futureSeasons.length === 0 ? (
        <Notice>No upcoming seasons announced yet. Check back soon.</Notice>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 18,
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          }}
        >
          {futureSeasons.map((season) => (
            <FutureSeasonCard key={season.number} season={season} />
          ))}
        </div>
      )}
    </div>
  );
}

const Notice = ({ children }: { children: React.ReactNode }) => (
  <div className="sfl-card" style={{ color: "var(--ink-soft)", fontSize: 14 }}>
    {children}
  </div>
);

const SeasonBlock = ({
  season,
  leagues,
  emptyMessage,
}: {
  season: Season;
  leagues: League[];
  emptyMessage: string;
}) => {
  const status = getSeasonStatus(season);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-display-stack)", fontWeight: 700, fontSize: 18, color: "var(--ink)" }}>
          {season.name}
        </span>
        <span className={`sfl-pill ${status === "current" ? "active" : "out"}`}>
          {status === "current" ? "In Play" : "Archived"}
        </span>
        <span style={{ fontSize: 13, color: "var(--ink-mute)" }}>{season.theme}</span>
      </div>

      {leagues.length === 0 ? (
        emptyMessage ? <Notice>{emptyMessage}</Notice> : null
      ) : (
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          }}
        >
          {leagues.map((league) => (
            <LeagueCard key={league.id} league={league} status={status} />
          ))}
        </div>
      )}
    </div>
  );
};

const LeagueCard = ({
  league,
  status,
}: {
  league: League;
  status: "current" | "past" | "future";
}) => {
  const isArchived = status === "past";
  return (
    <Link
      href={`/dashboard/my-leagues/${league.id}`}
      className="sfl-card"
      style={{
        display: "block",
        textDecoration: "none",
        borderLeft: `4px solid ${isArchived ? "var(--ink-mute)" : "var(--flame)"}`,
        border: "1px solid var(--line)",
      }}
    >
      <div style={{ fontFamily: "var(--font-display-stack)", fontWeight: 700, fontSize: 17, color: "var(--ink)", marginBottom: 4 }}>
        {league.name}
      </div>
      <div className="sfl-eyebrow" style={{ marginBottom: 8 }}>
        {getSeasonLabel(league.seasonNumber)} · {isArchived ? "Final Standings" : "In progress"}
      </div>
      <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
        <strong style={{ color: "var(--ink)" }}>{league.currentPlayers}</strong>/{league.maxPlayers} players
      </div>
    </Link>
  );
};
