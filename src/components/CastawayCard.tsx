import { useState } from "react";
import { Typography, Box, Chip, Tooltip } from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import { Castaway } from "@/types/castaway";
import { CastawayEventSummary } from "@/hooks/useEpisodes";
import { getEventLabel } from "@/utils/eventScoringConfig";
import { getRarityFromPoints, RarityConfig } from "@/utils/cardRarity";
import { getCastawayBadges } from "@/utils/castawayStatus";
import { INVENTORY_ITEMS } from "@/utils/inventoryConfig";

interface CastawayCardProps {
  castaway: Castaway;
  seasonScore?: number;
  isEliminated?: boolean;
  eventSummary?: CastawayEventSummary[];
  /** Short season label shown in the card footer (e.g. "Survivor 50"). Used in the Hall of Fame. */
  seasonLabel?: string;
}

const ELIMINATED_FRAME = "#d32f2f";

const ShimmerOverlay = ({ rarity }: { rarity: RarityConfig }) => {
  if (!rarity.shimmer) return null;
  const isMythic = rarity.label === "Mythic";
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        borderRadius: "inherit",
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
            ? "mythicSpin 8s linear infinite"
            : "shimmerSlide 3.5s ease-in-out infinite",
        },
        "@keyframes shimmerSlide": {
          "0%": { transform: "translateX(-40%)" },
          "100%": { transform: "translateX(40%)" },
        },
        "@keyframes mythicSpin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "@media (prefers-reduced-motion: reduce)": {
          "&::before": { animation: "none" },
        },
      }}
    />
  );
};

const RarityGem = ({ rarity }: { rarity: RarityConfig }) => (
  <Box
    aria-label={`${rarity.label} rarity`}
    sx={{
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: rarity.frameGradient,
      border: `1.5px solid ${rarity.frame}`,
      boxShadow: `0 0 6px ${rarity.accent}`,
      flexShrink: 0,
    }}
  />
);

const CardFace = ({
  rarity,
  isEliminated,
  children,
  backSide = false,
}: {
  rarity: RarityConfig;
  isEliminated: boolean;
  children: React.ReactNode;
  backSide?: boolean;
}) => {
  const frameGradient = isEliminated
    ? `linear-gradient(135deg, ${ELIMINATED_FRAME}, #7a1b1b)`
    : rarity.frameGradient;
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        backfaceVisibility: "hidden",
        transform: backSide ? "rotateY(180deg)" : "none",
        borderRadius: "14px",
        padding: "3px",
        background: frameGradient,
        boxShadow: isEliminated ? "none" : rarity.glow || undefined,
        display: "flex",
      }}
    >
      <Box
        sx={{
          position: "relative",
          flex: 1,
          borderRadius: "11px",
          background: backSide ? "#fafafa" : "#ffffff",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default function CastawayCard({
  castaway,
  seasonScore = 0,
  isEliminated = false,
  eventSummary = [],
  seasonLabel,
}: CastawayCardProps) {
  const [flipped, setFlipped] = useState(false);
  const rarity = getRarityFromPoints(seasonScore);
  const badges = getCastawayBadges(castaway);

  const handleFlip = () => setFlipped((prev) => !prev);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFlip();
    }
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={`${castaway.name} — ${rarity.label}${isEliminated ? ", eliminated" : ""}. ${seasonScore} season points. Press Enter to ${flipped ? "show photo" : "show stats"}.`}
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
      sx={{
        perspective: 1200,
        cursor: "pointer",
        height: "100%",
        "&:focus-visible": {
          outline: `2px solid ${rarity.accent}`,
          outlineOffset: 3,
          borderRadius: "14px",
        },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: { xs: 340, sm: 380 },
          transformStyle: "preserve-3d",
          transition: "transform 0.6s",
          transform: flipped ? "rotateY(180deg)" : "none",
        }}
      >
        {/* Front */}
        <CardFace rarity={rarity} isEliminated={isEliminated}>
          {/* Top banner */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.25,
              py: 0.75,
              background: isEliminated
                ? `linear-gradient(90deg, ${ELIMINATED_FRAME}, #7a1b1b)`
                : rarity.frameGradient,
              color: "#fff",
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}
          >
            <RarityGem rarity={rarity} />
            <Typography
              sx={{
                flex: 1,
                fontWeight: 800,
                fontSize: { xs: "0.95rem", sm: "1rem" },
                letterSpacing: 0.3,
                textTransform: "uppercase",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {castaway.name}
            </Typography>
            {seasonScore > 0 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 0.3,
                  px: 0.9,
                  py: 0.2,
                  borderRadius: "6px",
                  background: "rgba(0,0,0,0.28)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  fontWeight: 800,
                }}
              >
                <Typography
                  component="span"
                  sx={{ fontSize: "0.95rem", fontWeight: 800, lineHeight: 1 }}
                >
                  {seasonScore}
                </Typography>
                <Typography
                  component="span"
                  sx={{ fontSize: "0.65rem", opacity: 0.85, lineHeight: 1 }}
                >
                  PTS
                </Typography>
              </Box>
            )}
          </Box>

          {/* Art panel */}
          <Box
            sx={{
              position: "relative",
              flex: 1,
              mx: 1,
              mt: 1,
              borderRadius: "6px",
              overflow: "hidden",
              border: `2px solid ${isEliminated ? ELIMINATED_FRAME : rarity.frame}`,
              background: rarity.surface,
              minHeight: { xs: 200, sm: 240 },
            }}
          >
            {castaway.image && (
              <Box
                component="img"
                src={castaway.image}
                alt={castaway.name}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top",
                  display: "block",
                  position: "absolute",
                  inset: 0,
                  ...(isEliminated && {
                    filter: "grayscale(100%)",
                    opacity: 0.55,
                  }),
                }}
              />
            )}
            {!isEliminated && <ShimmerOverlay rarity={rarity} />}

            {/* Status badges — top-right corner of art panel */}
            <Box
              sx={{
                position: "absolute",
                top: 6,
                right: 6,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                zIndex: 2,
              }}
            >
              {INVENTORY_ITEMS.map(({ key, label, Icon, gradient, frame }) => {
                const count = badges.inventory[key];
                if (count <= 0) return null;
                return (
                  <Tooltip
                    key={key}
                    title={count > 1 ? `${label} × ${count}` : label}
                    placement="left"
                  >
                    <Box
                      aria-label={
                        count > 1 ? `${label}, quantity ${count}` : label
                      }
                      sx={{
                        position: "relative",
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: gradient,
                        border: `2px solid ${frame}`,
                        boxShadow:
                          "0 2px 6px rgba(0,0,0,0.35), inset 0 0 6px rgba(255,255,255,0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon sx={{ fontSize: 16, color: "#fff" }} />
                      {count > 1 && (
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: -4,
                            right: -4,
                            minWidth: 16,
                            height: 16,
                            px: 0.4,
                            borderRadius: 8,
                            background: "#1a1a1a",
                            color: "#fff",
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            lineHeight: "16px",
                            textAlign: "center",
                            border: "1.5px solid #fff",
                          }}
                        >
                          {count}
                        </Box>
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
              {badges.jury && (
                <Tooltip title="Jury member" placement="left">
                  <Box
                    aria-label="Jury member"
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle at 30% 30%, #8A76C4, #4B3A7A 60%, #2A1E4D 100%)",
                      border: "2px solid #1E1436",
                      boxShadow:
                        "0 2px 6px rgba(0,0,0,0.35), inset 0 0 6px rgba(255,255,255,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <GavelIcon sx={{ fontSize: 15, color: "#fff" }} />
                  </Box>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Footer (type line + eliminated state) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1.25,
              py: 0.9,
              mt: 1,
              borderTop: `1px solid ${rarity.frame}33`,
              background: rarity.surface,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: isEliminated ? ELIMINATED_FRAME : rarity.accent,
              }}
            >
              {isEliminated
                ? "— Torch Snuffed —"
                : seasonLabel
                  ? `${rarity.label} · ${seasonLabel}`
                  : `${rarity.label} · Castaway`}
            </Typography>
            {isEliminated && (
              <Chip
                label="Eliminated"
                size="small"
                sx={{
                  bgcolor: ELIMINATED_FRAME,
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  height: 20,
                }}
              />
            )}
          </Box>
        </CardFace>

        {/* Back */}
        <CardFace rarity={rarity} isEliminated={isEliminated} backSide>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.25,
              py: 0.75,
              background: isEliminated
                ? `linear-gradient(90deg, ${ELIMINATED_FRAME}, #7a1b1b)`
                : rarity.frameGradient,
              color: "#fff",
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}
          >
            <RarityGem rarity={rarity} />
            <Typography
              sx={{
                flex: 1,
                fontWeight: 800,
                fontSize: { xs: "0.8rem", sm: "0.85rem" },
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              {isEliminated ? "Torch Snuffed" : rarity.label}
            </Typography>
          </Box>

          <Box sx={{ p: 2, overflow: "auto", flex: 1 }}>
            {seasonScore > 0 && (
              <Box sx={{ mb: 2, textAlign: "center" }}>
                <Chip
                  label={`${seasonScore} pts this season`}
                  sx={{
                    bgcolor: rarity.accent,
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    boxShadow: rarity.glow || undefined,
                  }}
                />
              </Box>
            )}

            {eventSummary.length > 0 && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.25,
                  borderRadius: 1,
                  background: rarity.surface,
                  border: `1px solid ${rarity.frame}22`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                    color: rarity.accent,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                  }}
                >
                  Season Events
                </Typography>
                {eventSummary.map((e) => (
                  <Box
                    key={e.eventType}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 0.4,
                    }}
                  >
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {getEventLabel(e.eventType)}
                      {e.count > 1 && ` x${e.count}`}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: e.points >= 0 ? "#2e7d32" : "#d32f2f",
                        ml: 1,
                      }}
                    >
                      {e.points > 0 ? "+" : ""}
                      {e.points}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {eventSummary.length === 0 && seasonScore === 0 && (
              <Box sx={{ mb: 2, textAlign: "center" }}>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontStyle: "italic" }}
                >
                  No scoring events yet
                </Typography>
              </Box>
            )}

            {INVENTORY_ITEMS.some(({ key }) => badges.inventory[key] > 0) && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.25,
                  borderRadius: 1,
                  background: rarity.surface,
                  border: `1px solid ${rarity.frame}22`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                    color: rarity.accent,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    fontSize: "0.75rem",
                  }}
                >
                  Inventory
                </Typography>
                {INVENTORY_ITEMS.map(({ key, Icon, accent, statusPhrase }) => {
                  const count = badges.inventory[key];
                  if (count <= 0) return null;
                  return (
                    <Box
                      key={key}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        py: 0.25,
                      }}
                    >
                      <Icon sx={{ fontSize: 16, color: accent }} />
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: accent }}
                      >
                        {statusPhrase(count)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                mb: 1,
                color: rarity.accent,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                fontSize: "0.75rem",
              }}
            >
              Previous Seasons
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", lineHeight: 1.6 }}
            >
              {castaway.bio || "No previous season history available."}
            </Typography>
          </Box>
        </CardFace>
      </Box>
    </Box>
  );
}
