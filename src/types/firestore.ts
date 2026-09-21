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
}

/**
 * User document structure in Firestore
 */
export interface FirestoreUserData {
  displayName: string;
  email: string;
  avatar: string;
  joinedAt: Timestamp;
  /** @deprecated Legacy first-run tour flag. Superseded by `walkthroughVersion`. */
  tutorialCompleted: boolean;
  /**
   * Highest how-to-play walkthrough version this user has seen. Absent or lower
   * than `WALKTHROUGH_VERSION` means they're offered it again — bumping that
   * constant re-offers the tour to everyone.
   *
   * Only ever written from production; see `utils/persistEnvironment.ts`.
   */
  walkthroughVersion?: number;
  walkthroughSeenAt?: Timestamp;
  /**
   * Recap keys the user has already dismissed.
   * Format: `${leagueId}__${seasonNumber}`.
   */
  recapsSeen?: string[];
  /** Season numbers the user has opted into a launch notification for. */
  seasonNotifications?: number[];
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
