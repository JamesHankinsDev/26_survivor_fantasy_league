"use client";

import { CircularProgress } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { useHallOfFame } from "@/hooks/useHallOfFame";
import { getRarity, getRarityConfig } from "@/utils/cardRarity";
import { CastawayDetailGrid } from "@/components/cards";

export default function HallOfFamePage() {
  const { data: entries = [], isLoading, error } = useHallOfFame();

  const legendaryCount = entries.filter(
    (e) => getRarity(e.totalPoints) === "legendary",
  ).length;
  const mythicCount = entries.filter(
    (e) => getRarity(e.totalPoints) === "mythic",
  ).length;
  const legendaryAccent = getRarityConfig("legendary").accent;
  const mythicAccent = getRarityConfig("mythic").accent;

  // Returning players can appear in multiple seasons — keep card keys unique.
  const cards = entries.map((e) => ({ ...e, id: `${e.seasonNumber}-${e.id}` }));

  if (isLoading) {
    return (
      <div className="sfl-page" style={{ alignItems: "center", paddingTop: 48 }}>
        <CircularProgress sx={{ color: "var(--flame)" }} />
      </div>
    );
  }

  return (
    <div className="sfl-page">
      <div>
        <div className="sfl-eyebrow flame" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <EmojiEventsIcon sx={{ fontSize: 16 }} /> All-Time Legends
        </div>
        <h1 className="sfl-h1">Hall of Fame</h1>
        <p className="sfl-dash-lede">
          The greatest castaways across every season — anyone who finished at Legendary rarity or
          higher takes their place here, ranked by total points.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <span
            className="sfl-pill"
            style={{ background: `${mythicAccent}1A`, color: mythicAccent }}
          >
            {mythicCount} Mythic
          </span>
          <span
            className="sfl-pill"
            style={{ background: `${legendaryAccent}1A`, color: legendaryAccent }}
          >
            {legendaryCount} Legendary
          </span>
        </div>
      </div>

      {error && (
        <p className="sfl-dash-lede" style={{ color: "var(--danger)" }}>
          Couldn&apos;t load the Hall of Fame. Try again in a moment.
        </p>
      )}

      {cards.length === 0 ? (
        <p className="sfl-dash-lede">
          No castaways have reached Legendary rarity yet. Check back after the next finale.
        </p>
      ) : (
        <CastawayDetailGrid
          castaways={cards}
          seasonNumber={0}
          size="sm"
          showSeasonBadge
        />
      )}
    </div>
  );
}
