import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NotificationType } from "@/types/league";
import { dbLogger } from "@/lib/logger";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  metadata?: Record<string, string>;
  /**
   * Hold the *push* until this moment. The in-app notification appears in the
   * bell immediately either way — only the phone buzz is delayed.
   *
   * This exists for spoilers: scoring is entered as the episode airs on the
   * East Coast, and a push reading "Ozzy was voted out" would spoil it for
   * anyone three time zones behind. Defaults to sending immediately.
   */
  sendAfter?: Date;
  /**
   * Collapse key. Two notifications sharing a tag replace each other on the
   * lock screen instead of stacking. Defaults to the notification type.
   */
  tag?: string;
  /** Set false for notifications that should never leave the app. */
  push?: boolean;
}

/**
 * Envelope the Railway push-service polls for.
 *
 * `state` is the work queue: pending -> sent | failed | skipped. Keeping it on
 * the notification doc itself (rather than a separate queue collection) means a
 * notification and its delivery record can't drift apart, and the service needs
 * exactly one collection-group query to find due work.
 */
type PushState = "pending" | "skipped";

interface PushEnvelope {
  state: PushState;
  sendAfter: Timestamp;
  tag: string;
}

function buildPushEnvelope(params: CreateNotificationParams): PushEnvelope {
  return {
    state: params.push === false ? "skipped" : "pending",
    sendAfter: params.sendAfter ? Timestamp.fromDate(params.sendAfter) : Timestamp.now(),
    tag: params.tag ?? params.type,
  };
}

export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, link, metadata } = params;

  try {
    const notificationsRef = collection(db, "users", userId, "notifications");
    await addDoc(notificationsRef, {
      userId,
      type,
      title,
      message,
      link,
      read: false,
      createdAt: Timestamp.now(),
      metadata: metadata || {},
      push: buildPushEnvelope(params),
    });
  } catch (error) {
    dbLogger.error("Error creating notification:", error);
  }
}

export async function notifyMention(
  userId: string,
  leagueId: string,
  leagueName: string,
  mentionedBy: string,
  messageId: string,
) {
  await createNotification({
    userId,
    type: "mention",
    title: "You were mentioned!",
    message: `${mentionedBy} mentioned you in ${leagueName}`,
    link: `/dashboard/my-leagues/${leagueId}`,
    tag: `mention-${leagueId}`,
    metadata: {
      leagueId,
      leagueName,
      messageId,
      mentionedBy,
    },
  });
}

export async function notifyReaction(
  userId: string,
  leagueId: string,
  leagueName: string,
  reactedBy: string,
  emoji: string,
  messageId: string,
) {
  await createNotification({
    userId,
    type: "new_message",
    title: "New reaction to your message!",
    message: `${reactedBy} reacted ${emoji} to your message in ${leagueName}`,
    link: `/dashboard/my-leagues/${leagueId}`,
    tag: `reaction-${leagueId}`,
    metadata: {
      leagueId,
      leagueName,
      messageId,
      reactedBy,
      emoji,
    },
  });
}

/**
 * "Scores are up" for an episode.
 *
 * Deliberately says nothing about who scored or who went home — the push lands
 * on a lock screen, and the whole point of `sendAfter` is that some of the
 * league hasn't watched yet. Detail lives behind the link.
 */
export async function notifyScoresPosted(
  userId: string,
  leagueId: string,
  leagueName: string,
  episodeNumber: number,
  sendAfter?: Date,
) {
  await createNotification({
    userId,
    type: "score_update",
    title: `Episode ${episodeNumber} scores are in`,
    message: `${leagueName} standings have been updated.`,
    link: `/dashboard/my-leagues/${leagueId}`,
    sendAfter,
    tag: `scores-${leagueId}-${episodeNumber}`,
    metadata: { leagueId, leagueName, episode: String(episodeNumber) },
  });
}

/**
 * A castaway on this user's roster was voted out.
 *
 * Names the castaway: by the time an admin records an elimination the user's
 * own roster is affected, and `sendAfter` is what protects the unwatched.
 */
export async function notifyElimination(
  userId: string,
  leagueId: string,
  leagueName: string,
  castawayName: string,
  sendAfter?: Date,
) {
  await createNotification({
    userId,
    type: "elimination",
    title: "Your tribe took a hit",
    message: `${castawayName} was voted out — check your roster in ${leagueName}.`,
    link: `/dashboard/my-leagues/${leagueId}`,
    sendAfter,
    tag: `elimination-${leagueId}`,
    metadata: { leagueId, leagueName, castawayName },
  });
}
