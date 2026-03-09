import { ScoringEvent } from "@/types/league";

export interface Castaway {
  id: string;
  name: string;
  image?: string;
  imageUrl?: string;
  bio?: string;
  seasonNumber?: number;
  totalPoints: number;
  eliminated: boolean;
  eliminatedWeek?: number;
  /** Scoring events keyed by episode number, e.g. { "1": [...], "2": [...] } */
  weeklyEvents: Record<string, ScoringEvent[]>;
}
