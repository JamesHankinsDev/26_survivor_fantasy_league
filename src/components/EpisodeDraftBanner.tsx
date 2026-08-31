"use client";

import { useState } from "react";
import { Alert, AlertTitle, Box, Button, Chip, Collapse, Link, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import type { PendingEpisodeDraft, DraftConfidence } from "@/hooks/usePendingEpisodeScores";

export interface EpisodeDraftBannerProps {
  draft: PendingEpisodeDraft;
  episodeNumber: number;
  /** Fills the scoring form from the draft. Nothing is saved until the admin saves. */
  onApply: () => void;
  /** True once applied, so the button doesn't invite a double-apply. */
  applied: boolean;
}

const CONFIDENCE_COLOR: Record<DraftConfidence, "success" | "warning" | "error"> = {
  high: "success",
  medium: "warning",
  low: "error",
};

/**
 * Surfaces the Thursday-morning AI draft above the scoring form.
 *
 * Applying is an explicit click, and the low-confidence count is stated up
 * front rather than buried: idol and advantage plays are the events recaps
 * cover least reliably, and they're the ones worth checking by hand.
 */
export default function EpisodeDraftBanner({
  draft,
  episodeNumber,
  onApply,
  applied,
}: EpisodeDraftBannerProps) {
  const [showDetail, setShowDetail] = useState(false);

  if (draft.status === "not_found") {
    return (
      <Alert severity="info" sx={{ mb: 3 }} icon={<AutoAwesomeIcon />}>
        <AlertTitle>No draft for episode {episodeNumber}</AlertTitle>
        No recap was published yet when the drafter ran. Score this one by hand.
        {draft.summary ? ` ${draft.summary}` : ""}
      </Alert>
    );
  }

  const allEvents = draft.castaways.flatMap((c) => c.events);
  const lowConfidence = allEvents.filter((e) => e.confidence !== "high");

  return (
    <Alert severity="success" sx={{ mb: 3 }} icon={<AutoAwesomeIcon />}>
      <AlertTitle>Draft ready for episode {episodeNumber}</AlertTitle>

      <Typography variant="body2" sx={{ mb: 1 }}>
        {draft.summary}
      </Typography>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
        <Chip size="small" label={`${draft.castaways.length} castaways`} />
        <Chip size="small" label={`${allEvents.length} events`} />
        <Chip
          size="small"
          color={lowConfidence.length > 0 ? "warning" : "success"}
          label={
            lowConfidence.length > 0
              ? `${lowConfidence.length} need checking`
              : "all high confidence"
          }
        />
        {draft.unresolved.length > 0 && (
          <Chip size="small" color="warning" label={`${draft.unresolved.length} flagged`} />
        )}
      </Box>

      {draft.unresolved.length > 0 && (
        <Box component="ul" sx={{ mt: 0, mb: 1.5, pl: 2.5 }}>
          {draft.unresolved.map((note, i) => (
            <Typography component="li" variant="body2" key={i}>
              {note}
            </Typography>
          ))}
        </Box>
      )}

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <Button size="small" variant="contained" onClick={onApply} disabled={applied}>
          {applied ? "Applied to form" : "Apply draft to form"}
        </Button>
        <Button size="small" onClick={() => setShowDetail((v) => !v)}>
          {showDetail ? "Hide detail" : "Show detail & sources"}
        </Button>
      </Box>

      <Collapse in={showDetail}>
        <Box sx={{ mt: 2 }}>
          {draft.castaways.map((c) => (
            <Box key={c.castawayId} sx={{ mb: 1.5 }}>
              <Typography variant="body2" fontWeight={700}>
                {c.castawayName}
              </Typography>
              {c.events.map((e, i) => (
                <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "baseline", flexWrap: "wrap" }}>
                  <Chip
                    size="small"
                    color={CONFIDENCE_COLOR[e.confidence]}
                    variant="outlined"
                    label={e.confidence}
                  />
                  <Typography variant="body2">
                    {e.eventType}
                    {e.count > 1 ? ` ×${e.count}` : ""}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {e.evidence}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}

          {draft.sources.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Sources:{" "}
                {draft.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 ? ", " : ""}
                    <Link href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.title || s.url}
                    </Link>
                  </span>
                ))}
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Alert>
  );
}
