import { ScoringEventType } from "@/types/league";

// Scoring configuration: maps event types to point values.
// This is the S50 / legacy configuration. New per-season configs live in
// src/utils/seasonScoringConfig.ts.
export const SCORING_CONFIG: Record<ScoringEventType, number> = {
  immunity_win: 5, // Won an immunity challenge
  team_challenge_win: 3, // Castaway's team won a reward/immunity challenge
  found_idol: 5, // Found a hidden immunity idol
  found_advantage: 0, // S50 didn't split advantages from idols — 0 baseline
  used_idol_successfully: 3, // Successfully played an idol
  used_advantage_successfully: 0, // S50 didn't track this — 0 baseline
  voted_at_tribal: 3, // Voted at tribal council
  survived_episode: 1, // Survived the episode (made it past tribal council)
  fire_making_win: 5, // Won a fire-making challenge tiebreaker
  made_final_three: 5, // Made it to final 3
  season_winner: 10, // Won the season
  made_jury: 3, // Made the jury
  voted_out: -10, // Was voted out (eliminated)
};

// Helper function to calculate total points from events
export const calculatePointsFromEvents = (
  events: Array<{ eventType: ScoringEventType; count: number }>
): number => {
  return events.reduce((total, event) => {
    const pointValue = SCORING_CONFIG[event.eventType];
    return total + pointValue * event.count;
  }, 0);
};

// Get event label for UI display
export const getEventLabel = (eventType: ScoringEventType): string => {
  const labels: Record<ScoringEventType, string> = {
    immunity_win: "Immunity Win",
    team_challenge_win: "Team Challenge Win",
    found_idol: "Found Idol",
    found_advantage: "Found Advantage",
    used_idol_successfully: "Used Idol Successfully",
    used_advantage_successfully: "Used Advantage Successfully",
    voted_at_tribal: "Voted at Tribal",
    survived_episode: "Survived Episode",
    fire_making_win: "Fire-Making Win",
    made_final_three: "Made Final 3",
    season_winner: "Season Winner",
    made_jury: "Made Jury",
    voted_out: "Voted Out",
  };
  return labels[eventType];
};

// Get event description for about page
export const getEventDescription = (
  eventType: ScoringEventType
): { title: string; description: string } => {
  const descriptions: Record<
    ScoringEventType,
    { title: string; description: string }
  > = {
    immunity_win: {
      title: "Immunity Win",
      description:
        "Castaway won an individual immunity challenge. Worth +5 points.",
    },
    team_challenge_win: {
      title: "Team Challenge Win",
      description:
        "Castaway's team won a reward or immunity challenge. Worth +3 points.",
    },
    found_idol: {
      title: "Found Idol",
      description:
        "Castaway found a hidden immunity idol. Worth +5 points.",
    },
    found_advantage: {
      title: "Found Advantage",
      description:
        "Castaway found a non-idol advantage (extra vote, steal-a-vote, etc.). Worth +2 points (Season 51+).",
    },
    used_idol_successfully: {
      title: "Successfully Used Idol",
      description:
        "Castaway successfully played an idol that helped them. Worth +3 points.",
    },
    used_advantage_successfully: {
      title: "Successfully Used Advantage",
      description:
        "Castaway successfully played a non-idol advantage. Worth +1 point (Season 51+).",
    },
    voted_at_tribal: {
      title: "Voted at Tribal Council",
      description:
        "Castaway participated in voting at tribal council. Worth +3 points each vote.",
    },
    survived_episode: {
      title: "Survived the Episode",
      description:
        "Castaway survived the episode and was not voted out. Worth +1 point.",
    },
    fire_making_win: {
      title: "Fire-Making Challenge Win",
      description:
        "Castaway won a fire-making tiebreaker challenge. Worth +5 points.",
    },
    made_final_three: {
      title: "Made Final 3",
      description:
        "Castaway made it to the final three of the season. Worth +5 points.",
    },
    season_winner: {
      title: "Season Winner",
      description:
        "Castaway won the season and was crowned Sole Survivor. Worth +10 points.",
    },
    made_jury: {
      title: "Made the Jury",
      description: "Castaway was voted out but made the jury. Worth +3 points.",
    },
    voted_out: {
      title: "Voted Out",
      description:
        "Castaway was voted out of the game. Deducts -10 points from their total.",
    },
  };
  return descriptions[eventType];
};

// Get all event types for iteration
export const ALL_EVENT_TYPES: ScoringEventType[] = [
  "immunity_win",
  "team_challenge_win",
  "found_idol",
  "found_advantage",
  "used_idol_successfully",
  "used_advantage_successfully",
  "voted_at_tribal",
  "survived_episode",
  "fire_making_win",
  "made_final_three",
  "season_winner",
  "made_jury",
  "voted_out",
];
