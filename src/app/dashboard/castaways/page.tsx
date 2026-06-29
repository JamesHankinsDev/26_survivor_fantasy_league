"use client";

import { useState } from "react";
import {
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
  ALL_SEASONS,
  getDisplayCastawaySeason,
  getSeasonStatus,
} from "@/data/seasons";
import { useSeasonCastaways, useEliminatedCastaways } from "@/hooks/useCastaways";
import { useEpisodeScores } from "@/hooks/useEpisodes";
import { CastawayDetailGrid } from "@/components/cards";

type StatusFilter = "all" | "active" | "eliminated" | "jury";

const TBA_CARD_COUNT = 24;

const seasonOptions = [...ALL_SEASONS].sort((a, b) => b.number - a.number);

function TbaCard() {
  return (
    <div className="sfl-tcg-ghost size-sm" aria-label="To Be Announced castaway">
      <div className="sfl-tcg-ghost-inner">
        <HelpOutlineIcon sx={{ fontSize: 56 }} />
        <div>To Be Announced</div>
      </div>
    </div>
  );
}

export default function CastawaysPage() {
  const defaultSeason = getDisplayCastawaySeason();
  const [seasonNumber, setSeasonNumber] = useState<number>(defaultSeason.number);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const selectedSeason =
    ALL_SEASONS.find((s) => s.number === seasonNumber) ?? defaultSeason;
  const seasonStatus = getSeasonStatus(selectedSeason);

  const { data: castaways = [], isLoading } = useSeasonCastaways(seasonNumber);
  const { data: castawayScores = {} } = useEpisodeScores(seasonNumber);
  const { data: eliminatedCastawayIds = [] } = useEliminatedCastaways(seasonNumber);

  const premiereDate = new Date(selectedSeason.premiereDate);
  const formattedPremiereDate = premiereDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedConcludedDate = selectedSeason.concludedAt
    ? new Date(selectedSeason.concludedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const eliminatedSet = new Set(eliminatedCastawayIds);

  const jurySet = new Set(
    castaways
      .filter((c) =>
        Object.values(c.weeklyEvents || {}).some((events) =>
          events.some((e) => e.eventType === "made_jury"),
        ),
      )
      .map((c) => c.id),
  );

  const visibleCastaways = castaways
    .filter((c) => {
      if (statusFilter === "active") return !eliminatedSet.has(c.id);
      if (statusFilter === "eliminated") return eliminatedSet.has(c.id);
      if (statusFilter === "jury") return jurySet.has(c.id);
      return true;
    })
    // Use the episode-derived season score as the card's points (drives rarity).
    .map((c) => ({ ...c, totalPoints: castawayScores[c.id] ?? c.totalPoints }));

  const activeCount = castaways.length - eliminatedSet.size;
  const eliminatedCount = eliminatedSet.size;
  const juryCount = jurySet.size;

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: `All (${castaways.length})` },
    { value: "active", label: `Active (${activeCount})` },
    { value: "eliminated", label: `Eliminated (${eliminatedCount})` },
    { value: "jury", label: `The Jury (${juryCount})` },
  ];

  // Upcoming season with no cast data yet → render placeholder grid.
  const showTbaGrid = seasonStatus === "future" && castaways.length === 0;

  if (isLoading) {
    return (
      <div className="sfl-page" style={{ alignItems: "center", paddingTop: 48 }}>
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="sfl-page">
      {/* Header + season selector */}
      <div className="sfl-secthead">
        <div>
          <div className="sfl-eyebrow flame">
            {seasonStatus === "past"
              ? "Archive"
              : seasonStatus === "future"
                ? "Upcoming"
                : "Current Season"}
            {" · "}
            {selectedSeason.theme}
          </div>
          <h1 className="sfl-h1">{selectedSeason.name}</h1>
        </div>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="castaways-season-label">Season</InputLabel>
          <Select
            labelId="castaways-season-label"
            label="Season"
            value={seasonNumber}
            onChange={(e) => {
              setSeasonNumber(Number(e.target.value));
              setStatusFilter("all");
            }}
          >
            {seasonOptions.map((s) => (
              <MenuItem key={s.number} value={s.number}>
                {s.name}
                {getSeasonStatus(s) === "future"
                  ? " — Upcoming"
                  : getSeasonStatus(s) === "past"
                    ? " — Archive"
                    : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      {seasonStatus === "past" && (
        <p className="sfl-dash-lede">
          <strong>{selectedSeason.name} has concluded.</strong>
          {formattedConcludedDate ? ` Finale aired ${formattedConcludedDate}.` : ""} This page is
          an archive of the cast and their final scores.
        </p>
      )}
      {seasonStatus === "future" && (
        <p className="sfl-dash-lede">
          <strong>{selectedSeason.name} hasn&apos;t started yet.</strong> The official cast will be
          revealed closer to premiere — these placeholders fill in as castaways are announced.
        </p>
      )}
      {!showTbaGrid && (
        <p className="sfl-dash-lede">
          {castaways.length} all-star returning players{" "}
          {seasonStatus === "current" ? "compete" : "competed"} this season. Premiered{" "}
          <strong>{formattedPremiereDate}</strong>. Tap any card for their dossier and season
          events.
        </p>
      )}

      {showTbaGrid ? (
        <div className="sfl-card-grid">
          {Array.from({ length: TBA_CARD_COUNT }, (_, i) => (
            <TbaCard key={`tba-${i}`} />
          ))}
        </div>
      ) : (
        <>
          {/* Status filter pills */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {filters.map((f) => (
              <button
                key={f.value}
                className={`sfl-btn sm${statusFilter === f.value ? "" : " ghost"}`}
                onClick={() => setStatusFilter(f.value)}
                aria-pressed={statusFilter === f.value}
              >
                {f.label}
              </button>
            ))}
          </Box>

          {visibleCastaways.length === 0 ? (
            <p className="sfl-dash-lede">No {statusFilter} castaways to show.</p>
          ) : (
            <CastawayDetailGrid
              castaways={visibleCastaways}
              seasonNumber={seasonNumber}
              size="sm"
            />
          )}
        </>
      )}
    </div>
  );
}
