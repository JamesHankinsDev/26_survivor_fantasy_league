"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { WeeklyRoster, ScoringEvent } from "@/types/league";
import { Castaway } from "@/types/castaway";
import { getEventLabel, SCORING_CONFIG, calculatePointsFromEvents } from "@/utils/eventScoringConfig";

interface WeekBreakdown {
  week: number;
  weekScore: number;
  castaways: {
    id: string;
    name: string;
    events: ScoringEvent[];
    episodePoints: number;
  }[];
}

interface ScoringHistoryProps {
  weeklyRosters: WeeklyRoster[];
  allCastaways: Castaway[];
}

export default function ScoringHistory({
  weeklyRosters,
  allCastaways,
}: ScoringHistoryProps) {
  const [expanded, setExpanded] = useState<number | false>(false);

  const castawayMap = useMemo(() => {
    const map = new Map<string, Castaway>();
    for (const c of allCastaways) map.set(c.id, c);
    return map;
  }, [allCastaways]);

  const weeks: WeekBreakdown[] = useMemo(() => {
    return [...weeklyRosters]
      .sort((a, b) => b.week - a.week) // newest first
      .map((roster) => {
        const epStr = roster.week.toString();
        const castaways = (roster.castawayIds || []).map((id) => {
          const castaway = castawayMap.get(id);
          const events = castaway?.weeklyEvents?.[epStr] || [];
          const episodePoints = calculatePointsFromEvents(events);
          return {
            id,
            name: castaway?.name || "Unknown",
            events,
            episodePoints,
          };
        });

        // Compute weekScore live from castaway episode points — the stored
        // weekScore may be stale if the admin hasn't re-run propagation.
        const liveWeekScore = castaways.reduce((sum, c) => sum + c.episodePoints, 0);

        return {
          week: roster.week,
          weekScore: liveWeekScore,
          castaways,
        };
      });
  }, [weeklyRosters, castawayMap]);

  if (weeks.length === 0) {
    return (
      <Box sx={{ py: 2, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
          No scoring history yet. Scores appear after the first roster lock.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", mb: 1.5 }}>
        Scoring History
      </Typography>

      {weeks.map((week) => (
        <Accordion
          key={week.week}
          expanded={expanded === week.week}
          onChange={(_, isExpanded) => setExpanded(isExpanded ? week.week : false)}
          disableGutters
          sx={{
            boxShadow: "none",
            border: "1px solid",
            borderColor: "divider",
            "&:not(:last-child)": { borderBottom: 0 },
            "&::before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ minHeight: 48, "& .MuiAccordionSummary-content": { my: 0.5 } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Week {week.week}
              </Typography>
              <Chip
                label={`${week.weekScore} pts`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  bgcolor: week.weekScore > 0 ? "rgba(46, 125, 50, 0.1)" : "rgba(0,0,0,0.05)",
                  color: week.weekScore > 0 ? "#2e7d32" : "text.secondary",
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", ml: "auto", mr: 1 }}>
                {week.castaways.length} rostered
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
            {week.castaways.map((castaway, idx) => (
              <Box key={castaway.id}>
                {idx > 0 && <Divider sx={{ my: 1 }} />}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {castaway.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: castaway.episodePoints > 0 ? "#2e7d32" : castaway.episodePoints < 0 ? "#d32f2f" : "text.secondary",
                    }}
                  >
                    {castaway.episodePoints > 0 ? "+" : ""}{castaway.episodePoints} pts
                  </Typography>
                </Box>
                {castaway.events.length > 0 ? (
                  <Box sx={{ pl: 1 }}>
                    {castaway.events.map((event) => {
                      const pts = event.count * (SCORING_CONFIG[event.eventType] || 0);
                      return (
                        <Box
                          key={event.eventType}
                          sx={{ display: "flex", justifyContent: "space-between", py: 0.2 }}
                        >
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {getEventLabel(event.eventType)}
                            {event.count > 1 && ` x${event.count}`}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: pts >= 0 ? "#2e7d32" : "#d32f2f",
                            }}
                          >
                            {pts > 0 ? "+" : ""}{pts}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", pl: 1 }}>
                    No events this week
                  </Typography>
                )}
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
