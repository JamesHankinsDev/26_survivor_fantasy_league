"use client";

import { useMemo } from "react";
import type { League, TribeMember } from "@/types/league";
import SeasonRecapModal from "@/components/SeasonRecapModal";
import { useEpisodeScoresPerEpisode } from "@/hooks/useEpisodes";
import { useSeasonsWithOverrides } from "@/hooks/useSeasonsWithOverrides";
import { computeSeasonRecap } from "@/utils/seasonRecap";

interface PastSeasonRecapModalProps {
  open: boolean;
  league: League;
  /** Season the recap should reflect (NOT necessarily `league.seasonNumber`). */
  seasonNumber: number;
  /** Member snapshot for that season — from `seasonArchive` or live data. */
  memberDetails: TribeMember[];
  onClose: () => void;
}

/**
 * Wrapper around SeasonRecapModal that recomputes the recap for an arbitrary
 * past season + memberDetails snapshot. The base SeasonRecapModal hook is
 * hardcoded to the current season's live league data; this lets us replay
 * older or archived recaps from the home page's "Prior Season Tools".
 *
 * Episode-score fetching only fires when `open` is true (we early-return
 * before hooks run when closed via the wrapper guard above), so closed
 * instances are zero-cost.
 */
export default function PastSeasonRecapModal({
  open,
  league,
  seasonNumber,
  memberDetails,
  onClose,
}: PastSeasonRecapModalProps) {
  const { seasons } = useSeasonsWithOverrides();
  const { data: episodeScoresMap = {} } = useEpisodeScoresPerEpisode(seasonNumber);

  const mergeWeek = useMemo(() => {
    return seasons.find((s) => s.number === seasonNumber)?.mergeWeek ?? 0;
  }, [seasons, seasonNumber]);

  const recap = useMemo(
    () => computeSeasonRecap(memberDetails, episodeScoresMap, mergeWeek),
    [memberDetails, episodeScoresMap, mergeWeek],
  );

  return (
    <SeasonRecapModal
      open={open}
      league={league}
      recap={recap}
      onClose={onClose}
    />
  );
}
