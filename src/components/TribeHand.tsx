"use client";

import { Box, Typography } from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import { Castaway } from "@/types/castaway";
import { getRarityFromPoints } from "@/utils/cardRarity";
import { getCastawayBadges } from "@/utils/castawayStatus";
import { INVENTORY_ITEMS } from "@/utils/inventoryConfig";
import { EMPTY_INVENTORY } from "@/types/castaway";

interface TribeHandProps {
  roster: string[];
  allCastaways: Castaway[];
  eliminatedCastawayIds: string[];
  castawayPoints: Record<string, number>;
  size?: "compact" | "large";
}

const ELIMINATED_FRAME = "#d32f2f";

interface HandCardProps {
  castaway: Castaway | undefined;
  points: number;
  isEliminated: boolean;
  angle: number;
  xPct: number;
  zIndex: number;
  size: "compact" | "large";
}

function HandCard({
  castaway,
  points,
  isEliminated,
  angle,
  xPct,
  zIndex,
  size,
}: HandCardProps) {
  const isLarge = size === "large";
  const cardWidth = isLarge ? { xs: 100, sm: 188 } : { xs: 78, sm: 96 };
  const cardHeight = isLarge ? { xs: 144, sm: 270 } : { xs: 114, sm: 138 };
  const nameSize = isLarge ? { xs: "0.72rem", sm: "0.95rem" } : "0.62rem";
  const pointsSize = isLarge ? { xs: "0.72rem", sm: "1rem" } : "0.62rem";
  const liftPx = isLarge ? 36 : 22;
  const liftScale = isLarge ? 1.08 : 1.14;
  const badges = castaway
    ? getCastawayBadges(castaway)
    : { jury: false, inventory: EMPTY_INVENTORY };
  const badgeSize = isLarge ? 24 : 14;
  const badgeIconSize = isLarge ? 14 : 8;
  const rarity = getRarityFromPoints(points);
  const gradient = isEliminated
    ? `linear-gradient(135deg, ${ELIMINATED_FRAME}, #7a1b1b)`
    : rarity.frameGradient;
  const arcY = Math.abs(angle) * 0.9;
  const isMythic = !isEliminated && rarity.label === "Mythic";
  const shimmerOn = !isEliminated && rarity.shimmer;

  return (
    <Box
      role="img"
      tabIndex={0}
      aria-label={`${castaway?.name ?? "Unknown"}, ${rarity.label}, ${points} points${isEliminated ? ", eliminated" : ""}`}
      sx={{
        position: "absolute",
        bottom: 0,
        left: `${xPct}%`,
        width: cardWidth,
        height: cardHeight,
        transform: `translateX(-50%) rotate(${angle}deg) translateY(${arcY}px)`,
        transformOrigin: "bottom center",
        transition:
          "transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1), box-shadow 0.3s",
        zIndex,
        cursor: "pointer",
        borderRadius: "10px",
        padding: "2px",
        background: gradient,
        boxShadow: isEliminated
          ? "0 2px 6px rgba(0,0,0,0.18)"
          : rarity.glow || "0 2px 6px rgba(0,0,0,0.18)",
        "&:hover, &:focus-visible": {
          transform: `translateX(-50%) rotate(0deg) translateY(-${liftPx}px) scale(${liftScale})`,
          zIndex: 100,
          boxShadow: isEliminated
            ? "0 14px 28px rgba(0,0,0,0.3)"
            : rarity.glow
              ? `${rarity.glow}, 0 14px 28px rgba(0,0,0,0.25)`
              : "0 14px 28px rgba(0,0,0,0.25)",
          outline: "none",
        },
        "@keyframes handShimmer": {
          "0%": { transform: "translateX(-40%)" },
          "100%": { transform: "translateX(40%)" },
        },
        "@keyframes handMythicSpin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: "8px",
          background: "#fff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Art */}
        <Box
          sx={{
            position: "relative",
            flex: 1,
            overflow: "hidden",
            background: rarity.surface,
          }}
        >
          {castaway?.image && (
            <Box
              component="img"
              src={castaway.image}
              alt=""
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top",
                position: "absolute",
                inset: 0,
                filter: isEliminated ? "grayscale(100%)" : "none",
                opacity: isEliminated ? 0.55 : 1,
              }}
            />
          )}
          <Box
            sx={{
              position: "absolute",
              top: 3,
              right: 3,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              zIndex: 3,
            }}
          >
            {INVENTORY_ITEMS.map(({ key, label, Icon, gradient, frame }) => {
              const count = badges.inventory[key];
              if (count <= 0) return null;
              return (
                <Box
                  key={key}
                  aria-label={count > 1 ? `${label}, quantity ${count}` : label}
                  sx={{
                    position: "relative",
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: "50%",
                    background: gradient,
                    border: `1.5px solid ${frame}`,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon sx={{ fontSize: badgeIconSize, color: "#fff" }} />
                  {count > 1 && (
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: -3,
                        right: -3,
                        minWidth: 11,
                        height: 11,
                        px: 0.3,
                        borderRadius: 6,
                        background: "#1a1a1a",
                        color: "#fff",
                        fontSize: "0.5rem",
                        fontWeight: 800,
                        lineHeight: "11px",
                        textAlign: "center",
                        border: "1px solid #fff",
                      }}
                    >
                      {count}
                    </Box>
                  )}
                </Box>
              );
            })}
            {badges.jury && (
              <Box
                aria-label="Jury member"
                sx={{
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 30% 30%, #8A76C4, #4B3A7A 60%, #2A1E4D 100%)",
                  border: "1.5px solid #1E1436",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GavelIcon sx={{ fontSize: badgeIconSize, color: "#fff" }} />
              </Box>
            )}
          </Box>
          {shimmerOn && (
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: "-50%",
                  background: isMythic
                    ? "conic-gradient(from 0deg, rgba(255,61,138,0.35), rgba(91,107,255,0.35), rgba(32,217,200,0.35), rgba(255,176,32,0.35), rgba(181,40,217,0.35), rgba(255,61,138,0.35))"
                    : "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 48%, rgba(255,255,255,0.1) 52%, transparent 70%)",
                  mixBlendMode: "overlay",
                  animation: isMythic
                    ? "handMythicSpin 8s linear infinite"
                    : "handShimmer 3.5s ease-in-out infinite",
                },
                "@media (prefers-reduced-motion: reduce)": {
                  "&::before": { animation: "none" },
                },
              }}
            />
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            px: 0.6,
            py: 0.35,
            background: gradient,
            color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 0.3,
          }}
        >
          <Typography
            sx={{
              fontSize: nameSize,
              fontWeight: 800,
              letterSpacing: 0.25,
              textTransform: "uppercase",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {castaway?.name?.split(" ")[0] ?? "?"}
          </Typography>
          <Typography sx={{ fontSize: pointsSize, fontWeight: 800 }}>
            {points}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function TribeHand({
  roster,
  allCastaways,
  eliminatedCastawayIds,
  castawayPoints,
  size = "compact",
}: TribeHandProps) {
  const count = roster.length;
  if (count === 0) return null;

  const isLarge = size === "large";
  const mid = (count - 1) / 2;
  const ANGLE_STEP = 7;
  const X_STEP = count <= 3 ? 20 : 15;

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: isLarge ? { xs: 174, sm: 312 } : { xs: 140, sm: 168 },
        mt: 0.5,
        overflow: "visible",
      }}
    >
      {roster.map((id, i) => {
        const castaway = allCastaways.find((c) => c.id === id);
        const isEliminated = eliminatedCastawayIds.includes(id);
        const points = castawayPoints[id] || 0;
        const offset = i - mid;
        const angle = offset * ANGLE_STEP;
        const xPct = 50 + offset * X_STEP;
        const zIndex = 10 - Math.round(Math.abs(offset));
        return (
          <HandCard
            key={id}
            castaway={castaway}
            points={points}
            isEliminated={isEliminated}
            angle={angle}
            xPct={xPct}
            zIndex={zIndex}
            size={size}
          />
        );
      })}
    </Box>
  );
}
