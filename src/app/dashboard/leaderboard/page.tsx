"use client";

import { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { assignRanks, withRankTrends } from "@/types/league";
import type { Castaway } from "@/types/castaway";
import { useUserLeagues } from "@/hooks/useLeagues";
import { getSeasonLabel, getSeasonStatus } from "@/data/seasons";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import { useEliminatedCastaways, useSeasonCastaways } from "@/hooks/useCastaways";
import { useComputedScores } from "@/hooks/useScores";
import RankTrendIndicator from "@/components/RankTrendIndicator";
import { TradingCard } from "@/components/cards";

// Prevent static generation for this page
export const dynamic = "force-dynamic";

const RANK_CLASS = ["gold", "silver", "bronze"] as const;

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="sfl-page">
      <div className="sfl-card" style={{ color: "var(--ink-soft)" }}>
        {children}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  const { data: leagues = [], isLoading: loading } = useUserLeagues(user?.uid || null);
  const { seasons } = useSeasonsWithOverrides();

  // The leaderboard only deals with leagues from currently-active seasons.
  const activeSeasonNumbers = useMemo(() => {
    const set = new Set<number>();
    for (const s of seasons) if (getSeasonStatus(s) === "current") set.add(s.number);
    return set;
  }, [seasons]);

  const visibleLeagues = useMemo(
    () => leagues.filter((l) => activeSeasonNumbers.has(l.seasonNumber)),
    [leagues, activeSeasonNumbers],
  );

  useEffect(() => {
    if (!user) router.push("/");
  }, [user, router]);

  useEffect(() => {
    if (visibleLeagues.length === 0) {
      if (selectedLeagueId !== null) setSelectedLeagueId(null);
      return;
    }
    if (!selectedLeagueId || !visibleLeagues.some((l) => l.id === selectedLeagueId)) {
      setSelectedLeagueId(visibleLeagues[0].id);
    }
  }, [visibleLeagues, selectedLeagueId]);

  const selectedLeague = visibleLeagues.find((l) => l.id === selectedLeagueId);
  const seasonForScoring = selectedLeague?.seasonNumber ?? 0;

  const { data: eliminatedCastawayIds = [] } = useEliminatedCastaways(seasonForScoring);
  const eliminatedIds = new Set(eliminatedCastawayIds);
  const { data: seasonCastaways = [] } = useSeasonCastaways(seasonForScoring);
  const castawayById = useMemo(() => {
    const m = new Map<string, Castaway>();
    for (const c of seasonCastaways) m.set(c.id, c);
    return m;
  }, [seasonCastaways]);

  const { computedMembers, castawaySeasonScores } = useComputedScores(
    seasonForScoring,
    selectedLeague?.memberDetails || [],
  );

  const rankedMembers = withRankTrends(assignRanks(computedMembers));

  const getPlayerName = (member: { userId: string; ownerName?: string; displayName: string }) =>
    user && member.userId === user.uid
      ? user.displayName || user.email || member.displayName
      : member.ownerName || member.displayName;

  /** The member's highest-scoring rostered castaway, as a TradingCard-ready card. */
  const bestCard = (roster: string[] = []): Castaway | null => {
    const cards = roster
      .map((id) => {
        const c = castawayById.get(id);
        if (!c) return null;
        return { ...c, totalPoints: castawaySeasonScores[id] ?? c.totalPoints };
      })
      .filter((c): c is Castaway => Boolean(c));
    cards.sort((a, b) => b.totalPoints - a.totalPoints);
    return cards[0] ?? null;
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="sfl-page" style={{ alignItems: "center", paddingTop: 48 }} aria-busy="true">
        <CircularProgress aria-label="Loading leaderboard" />
      </div>
    );
  }

  if (leagues.length === 0) {
    return <Notice>You haven&apos;t joined any leagues yet. Create or join a league to see leaderboards.</Notice>;
  }
  if (visibleLeagues.length === 0) {
    return (
      <Notice>
        No leaderboards to show right now. Leaderboards appear here once a season is active. Your
        archived league standings stay available from the Home page or the league&apos;s detail page.
      </Notice>
    );
  }
  if (!selectedLeague) {
    return <Notice>League not found.</Notice>;
  }

  const podium = rankedMembers.slice(0, 3);
  // Podium display order: 2nd, 1st, 3rd (1st centered + lifted).
  const podiumOrder = [1, 0, 2];

  return (
    <div className="sfl-page">
      <div className="sfl-secthead">
        <div>
          <div className="sfl-eyebrow flame">
            {getSeasonLabel(selectedLeague.seasonNumber)} ·{" "}
            {selectedLeague.memberDetails?.length || 0}/{selectedLeague.maxPlayers} players
          </div>
          <h1 className="sfl-h1">Standings</h1>
        </div>
      </div>

      {/* League selector — current-season leagues only */}
      {visibleLeagues.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {visibleLeagues.map((league) => (
            <button
              key={league.id}
              className={`sfl-btn sm${selectedLeagueId === league.id ? "" : " ghost"}`}
              onClick={() => setSelectedLeagueId(league.id)}
              aria-pressed={selectedLeagueId === league.id}
            >
              {league.name}
            </button>
          ))}
        </div>
      )}

      {/* Podium */}
      {podium.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 28, padding: "8px 0 18px", flexWrap: "wrap" }}>
          {podiumOrder.map((idx) => {
            const m = podium[idx];
            if (!m) return null;
            const card = bestCard(m.roster);
            const lift = idx === 0 ? -22 : 0;
            return (
              <div key={m.userId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transform: `translateY(${lift}px)` }}>
                <div className={`sfl-board-rank ${RANK_CLASS[idx]}`} style={{ width: "auto", fontSize: idx === 0 ? 28 : 20 }}>
                  {idx === 0 ? "1st" : idx === 1 ? "2nd" : "3rd"}
                </div>
                {card ? (
                  <TradingCard castaway={card} size={idx === 0 ? "md" : "sm"} />
                ) : (
                  <TradingCard ghost size={idx === 0 ? "md" : "sm"} />
                )}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-display-stack)", fontWeight: 800, fontSize: 15, color: "var(--ink)" }}>
                    {m.displayName || "Unnamed Tribe"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                    {getPlayerName(m)} · {m.totalPoints || 0} pts
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Standings table */}
      <div className="sfl-card" style={{ padding: 0, overflow: "auto" }}>
        <table className="sfl-board-table" aria-label={`${selectedLeague.name} leaderboard standings`}>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Tribe</th>
              <th className="col-md">Owner</th>
              <th className="col-md">Best Card</th>
              <th style={{ textAlign: "center" }}>Active</th>
              <th style={{ textAlign: "right" }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {rankedMembers.map((member) => {
              const activeCastaways =
                member.roster?.filter((id) => !eliminatedIds.has(id)).length || 0;
              const isCurrentUser = member.userId === user.uid;
              const card = bestCard(member.roster);
              const initials = (member.displayName || "?")
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("");
              return (
                <tr key={member.userId} className={isCurrentUser ? "self" : ""}>
                  <td>
                    <span className={`sfl-board-rank ${RANK_CLASS[member.rank - 1] || ""}`}>
                      {member.isTied ? "T-" : ""}
                      {member.rank}
                    </span>
                    <RankTrendIndicator trend={member.trend} delta={member.trendDelta} />
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <span className="sfl-avatar sm" style={{ background: member.tribeColor }}>
                        {initials}
                      </span>
                      <b style={{ fontWeight: 700 }}>{member.displayName || "Unnamed Tribe"}</b>
                    </span>
                  </td>
                  <td className="col-md" style={{ color: "var(--ink-soft)" }}>
                    {getPlayerName(member)}
                    {isCurrentUser && (
                      <span className="sfl-pill active" style={{ marginLeft: 8 }}>
                        You
                      </span>
                    )}
                  </td>
                  <td className="col-md" style={{ color: "var(--ink-soft)" }}>{card?.name ?? "—"}</td>
                  <td style={{ textAlign: "center", fontFamily: "var(--font-mono-stack)" }}>
                    {activeCastaways}/5
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono-stack)", fontWeight: 700 }}>
                    {member.totalPoints || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
