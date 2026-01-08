export interface Castaway {
  id: string;
  name: string;
  image?: string; // Legacy property
  imageUrl?: string; // New property
  bio?: string;
  seasonNumber?: number;
  stats?: Record<string, any>;
  seasonalStats?: {
    totalPoints: number;
    aliveBonus: number;
    immunityWins: number;
    juryVotes: number;
    placementBonus: number;
    other: number;
  };
}

