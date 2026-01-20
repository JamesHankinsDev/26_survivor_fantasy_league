import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NotificationType } from "@/types/league";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  metadata?: Record<string, any>;
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
    });
  } catch (error) {
    console.error("Error creating notification:", error);
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
    link: `/dashboard/my-leagues/${leagueId}/messages`,
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
    link: `/dashboard/my-leagues/${leagueId}/messages`,
    metadata: {
      leagueId,
      leagueName,
      messageId,
      reactedBy,
      emoji,
    },
  });
}
