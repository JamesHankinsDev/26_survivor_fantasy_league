"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { getSeasonStatus, getSeasonLabel, type Season } from "@/data/seasons";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import FutureSeasonCard from "@/components/FutureSeasonCard";
import type { League } from "@/types/league";

/**
 * Multi-season hub — extracted from the original `/dashboard/page.tsx` with
 * no behavior change.
 *
 * The page-level orchestrator renders this when the user has no league in a
 * currently-playing season (pre-season + concluded-only states fall here).
 * In-season users see `<ActiveDashboardView />` instead.
 */
export default function SeasonHubView({ leagues }: { leagues: League[] }) {
  const { seasons } = useSeasonsWithOverrides();

  const leaguesBySeason = useMemo(() => {
    const map = new Map<number, League[]>();
    for (const l of leagues) {
      const key = l.seasonNumber ?? 50;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return map;
  }, [leagues]);

  const currentSeasons = seasons.filter(
    (s) => getSeasonStatus(s) === "current",
  );
  const pastSeasons = seasons
    .filter((s) => getSeasonStatus(s) === "past")
    .sort((a, b) => b.number - a.number);
  const futureSeasons = seasons
    .filter((s) => getSeasonStatus(s) === "future")
    .sort((a, b) => a.premiereDate.localeCompare(b.premiereDate));

  return (
    <Box>
      {/* CURRENT SEASON */}
      <HubSectionHeader title="Current Season" />
      {currentSeasons.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          No season is currently in play.
          {futureSeasons.length > 0
            ? ` Survivor ${futureSeasons[0].number} is on the horizon — see Future Seasons below.`
            : ""}
        </Alert>
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

      <Divider sx={{ my: 5 }} />

      {/* PAST SEASONS */}
      <HubSectionHeader title="Past Seasons" />
      {pastSeasons.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          Your archived leagues will appear here once a season ends.
        </Alert>
      ) : (
        pastSeasons.map((season) => {
          const userLeagues = leaguesBySeason.get(season.number) ?? [];
          if (userLeagues.length === 0) return null;
          return (
            <SeasonBlock
              key={season.number}
              season={season}
              leagues={userLeagues}
              emptyMessage=""
            />
          );
        })
      )}

      {pastSeasons.length > 0 &&
        pastSeasons.every(
          (s) => (leaguesBySeason.get(s.number) ?? []).length === 0,
        ) && (
          <Alert severity="info" sx={{ mb: 4 }}>
            No archived leagues yet.
          </Alert>
        )}

      <Divider sx={{ my: 5 }} />

      {/* FUTURE SEASONS */}
      <HubSectionHeader title="Future Seasons" />
      {futureSeasons.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          No upcoming seasons announced yet. Check back soon.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2.5,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
          }}
        >
          {futureSeasons.map((season) => (
            <FutureSeasonCard key={season.number} season={season} />
          ))}
        </Box>
      )}
    </Box>
  );
}

const HubSectionHeader = ({ title }: { title: string }) => (
  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
    {title}
  </Typography>
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
  const statusChip =
    status === "current" ? (
      <Chip
        label="In Play"
        size="small"
        sx={{ bgcolor: "var(--jungle)", color: "white", fontWeight: 700 }}
      />
    ) : (
      <Chip
        label="Archived"
        size="small"
        sx={{ bgcolor: "var(--ink-mute)", color: "white", fontWeight: 700 }}
      />
    );

  return (
    <Box sx={{ mb: 4 }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 1.5 }}
        flexWrap="wrap"
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {season.name}
        </Typography>
        {statusChip}
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {season.theme}
        </Typography>
      </Stack>

      {leagues.length === 0 ? (
        emptyMessage ? (
          <Alert severity="info">{emptyMessage}</Alert>
        ) : null
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
          }}
        >
          {leagues.map((league) => (
            <LeagueCard key={league.id} league={league} status={status} />
          ))}
        </Box>
      )}
    </Box>
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
    <Card
      sx={{
        borderLeft: `4px solid ${isArchived ? "var(--ink-mute)" : "var(--flame)"}`,
        height: "100%",
      }}
    >
      <CardActionArea
        component={Link}
        href={`/dashboard/my-leagues/${league.id}`}
        sx={{ height: "100%" }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            {league.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", display: "block", mb: 1.5 }}
          >
            {getSeasonLabel(league.seasonNumber)} ·{" "}
            {isArchived ? "Final Standings" : "In progress"}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            <strong>{league.currentPlayers}</strong>/{league.maxPlayers} players
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};
