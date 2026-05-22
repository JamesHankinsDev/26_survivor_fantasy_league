/**
 * Firestore-specific type definitions
 * These types represent the actual structure of documents in Firestore
 */

import { Timestamp } from "firebase/firestore";
import { TribeMember } from "./league";

/**
 * League document structure in Firestore
 */
export interface FirestoreLeagueData {
  name: string;
  ownerId: string;
  ownerName: string;
  maxPlayers: number;
  currentPlayers: number;
  joinCode: string;
  members: string[];
  memberDetails: TribeMember[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: "active" | "archived";
  addDropRestrictionEnabled?: boolean;
  leagueStartDate?: string;
  seasonNumber: number;
  proposalVotes?: Record<string, Record<string, "yay" | "nay">>;
  proposalOutcomes?: Record<
    string,
    { outcome: "adopted" | "rejected"; decidedAt: Timestamp; decidedBy: string }
  >;
}

/**
 * User document structure in Firestore
 */
export interface FirestoreUserData {
  displayName: string;
  email: string;
  avatar: string;
  joinedAt: Timestamp;
  tutorialCompleted: boolean;
  /**
   * Recap keys the user has already dismissed.
   * Format: `${leagueId}__${seasonNumber}`.
   */
  recapsSeen?: string[];
  /** Season numbers the user has opted into a launch notification for. */
  seasonNotifications?: number[];
  /**
   * One-off proposal / announcement modals the user has dismissed.
   * Keyed by proposal slug, e.g. "s51_rules": true.
   */
  proposalsSeen?: Record<string, boolean>;
}

/**
 * Castaway document structure in Firestore
 */
export interface FirestoreCastawayData {
  name: string;
  image?: string;
  imageUrl?: string;
  bio?: string;
  seasonNumber?: number;
  stats?: Record<string, any>;
}

/**
 * Message document structure in Firestore
 */
export interface FirestoreMessageData {
  leagueId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  isEdited: boolean;
}
