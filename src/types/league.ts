// Member/Tribe data
export interface TribeMember {
  userId: string;
  displayName: string;
  avatar: string; // URL to avatar image
  tribeColor: string; // Hex color for tribe
  points: number;
  joinedAt: Date | any;
}

// League data model and types
export interface League {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  maxPlayers: number;
  currentPlayers: number;
  joinCode: string;
  members: string[]; // Array of user IDs (legacy, kept for backward compat)
  memberDetails: TribeMember[]; // New: detailed member info with tribe data
  createdAt: Date | any;
  updatedAt: Date | any;
  status: 'active' | 'archived';
}

export interface LeagueInvite {
  leagueId: string;
  leagueName: string;
  ownerName: string;
  joinCode: string;
  maxPlayers: number;
}

// Helper to get member rank in league (1st place, 2nd place, etc)
export const getMemberRank = (members: TribeMember[], userId: string): number => {
  const sorted = [...members].sort((a, b) => b.points - a.points);
  return sorted.findIndex(m => m.userId === userId) + 1;
};

// Generate a unique join code (6-character alphanumeric)
export const generateJoinCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate a Firestore-friendly league ID
export const generateLeagueId = (): string => {
  return `league_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get the join URL for a league
export const getLeagueJoinUrl = (joinCode: string): string => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/join/${joinCode}`;
};
