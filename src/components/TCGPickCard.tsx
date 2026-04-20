"use client";

import { Box, Typography, Button } from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import BlockIcon from "@mui/icons-material/Block";
import AddIcon from "@mui/icons-material/Add";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Castaway } from "@/types/castaway";
import { getRarityFromPoints } from "@/utils/cardRarity";
import { getCastawayBadges } from "@/utils/castawayStatus";
import { INVENTORY_ITEMS } from "@/utils/inventoryConfig";
import GavelIcon from "@mui/icons-material/Gavel";

export type PickAction = "discard" | "add";

interface TCGPickCardProps {
  castaway: Castaway | undefined;
  castawayId: string;
  seasonScore: number;
  isEliminated?: boolean;
  isPendingDrop?: boolean;
  isPendingAdd?: boolean;
  canAct: boolean;
  action: PickAction;
  onAction: () => void;
  isMobile: boolean;
  /** Origin column for DnD */
  origin: "roster" | "available";
}

const ELIMINATED_FRAME = "#d32f2f";

export default function TCGPickCard({
  castaway,
  castawayId,
  seasonScore,
  isEliminated,
  isPendingDrop,
  isPendingAdd,
  canAct,
  action,
  onAction,
  isMobile,
  origin,
}: TCGPickCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${origin}-${castawayId}`,
      data: { castawayId, origin },
      disabled: !canAct || isMobile,
    });

  const rarity = getRarityFromPoints(seasonScore);
  const badges = castaway
    ? getCastawayBadges(castaway)
    : { jury: false, inventory: { immunity_idol: 0, extra_vote: 0, steal_a_vote: 0, lose_your_vote: 0 } };

  const frameGradient = isPendingDrop
    ? "linear-gradient(135deg, #f06a6a, #d32f2f)"
    : isPendingAdd
      ? "linear-gradient(135deg, #72c786, #2e7d32)"
      : isEliminated
        ? `linear-gradient(135deg, ${ELIMINATED_FRAME}, #7a1b1b)`
        : rarity.frameGradient;

  const actionColor = action === "discard" ? "#d32f2f" : "#2e7d32";
  const actionHoverBg =
    action === "discard" ? "rgba(211, 47, 47, 0.08)" : "rgba(46, 125, 50, 0.08)";
  const actionLabel =
    action === "discard"
      ? isPendingDrop
        ? "Cancel Discard"
        : "Discard"
      : isPendingAdd
        ? "Cancel Add"
        : "Add to Hand";

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 10 }
    : undefined;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...(isMobile ? {} : { ...attributes, ...listeners })}
      sx={{
        position: "relative",
        borderRadius: "12px",
        padding: "3px",
        background: frameGradient,
        boxShadow: isPendingDrop
          ? "0 0 0 3px rgba(211, 47, 47, 0.25)"
          : isPendingAdd
            ? "0 0 0 3px rgba(46, 125, 50, 0.25)"
            : isEliminated
              ? "none"
              : rarity.glow || "0 2px 6px rgba(0,0,0,0.15)",
        opacity: isDragging ? 0.35 : 1,
        cursor: canAct && !isMobile ? "grab" : "default",
        transition: "transform 0.15s, box-shadow 0.2s",
        "&:hover": canAct ? { transform: "translateY(-2px)" } : undefined,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          borderRadius: "9px",
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {/* Name banner */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 1,
            py: 0.6,
            background: frameGradient,
            color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
        >
          {canAct && !isMobile && (
            <DragIndicatorIcon
              sx={{ fontSize: 14, opacity: 0.85, flexShrink: 0 }}
            />
          )}
          <Typography
            sx={{
              flex: 1,
              fontWeight: 800,
              fontSize: "0.75rem",
              letterSpacing: 0.3,
              textTransform: "uppercase",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: isPendingDrop ? "line-through" : "none",
            }}
          >
            {castaway?.name ?? "Unknown"}
          </Typography>
          {seasonScore > 0 && (
            <Box
              sx={{
                px: 0.75,
                py: 0.1,
                borderRadius: "4px",
                background: "rgba(0,0,0,0.28)",
                border: "1px solid rgba(255,255,255,0.35)",
                fontWeight: 800,
                fontSize: "0.7rem",
                lineHeight: 1.2,
              }}
            >
              {seasonScore}
            </Box>
          )}
        </Box>

        {/* Art */}
        <Box
          sx={{
            position: "relative",
            height: 130,
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
                filter: isEliminated ? "grayscale(100%)" : "none",
                opacity: isEliminated ? 0.55 : 1,
                display: "block",
              }}
            />
          )}

          {/* Badges (top-right) */}
          <Box
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
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
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: gradient,
                    border: `1.5px solid ${frame}`,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon sx={{ fontSize: 11, color: "#fff" }} />
                  {count > 1 && (
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: -3,
                        right: -3,
                        minWidth: 12,
                        height: 12,
                        px: 0.3,
                        borderRadius: 6,
                        background: "#1a1a1a",
                        color: "#fff",
                        fontSize: "0.55rem",
                        fontWeight: 800,
                        lineHeight: "12px",
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
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 30% 30%, #8A76C4, #4B3A7A 60%, #2A1E4D 100%)",
                  border: "1.5px solid #1E1436",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GavelIcon sx={{ fontSize: 10, color: "#fff" }} />
              </Box>
            )}
          </Box>

          {isEliminated && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.35)",
              }}
            >
              <Typography
                sx={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.7rem",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  textShadow: "0 1px 3px rgba(0,0,0,0.6)",
                }}
              >
                Eliminated
              </Typography>
            </Box>
          )}
        </Box>

        {/* Action button */}
        <Box sx={{ p: 0.6 }}>
          <Button
            fullWidth
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            disabled={!canAct}
            variant={isPendingDrop || isPendingAdd ? "contained" : "outlined"}
            startIcon={
              action === "discard" ? (
                <BlockIcon sx={{ fontSize: 14 }} />
              ) : (
                <AddIcon sx={{ fontSize: 14 }} />
              )
            }
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "none",
              minHeight: 0,
              py: 0.4,
              color:
                isPendingDrop || isPendingAdd ? "#fff" : actionColor,
              bgcolor:
                isPendingDrop || isPendingAdd ? actionColor : "transparent",
              borderColor: actionColor,
              "&:hover": {
                bgcolor:
                  isPendingDrop || isPendingAdd
                    ? actionColor
                    : actionHoverBg,
                borderColor: actionColor,
              },
            }}
          >
            {actionLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
