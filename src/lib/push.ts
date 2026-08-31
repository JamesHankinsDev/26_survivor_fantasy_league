/**
 * Web Push helpers — browser-side subscription plumbing.
 *
 * Subscriptions live at `users/{uid}/pushSubscriptions/{endpointHash}`. Keying
 * by a hash of the endpoint (rather than an auto-id) makes re-subscribing on the
 * same device idempotent instead of piling up duplicate rows that would each
 * deliver the same notification.
 *
 * The Railway push-service (see push-service/) reads these docs and prunes any
 * endpoint the push provider reports as gone.
 */

import { doc, deleteDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Push needs a service worker, the Push API, and a configured VAPID key. */
export const isPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  VAPID_PUBLIC_KEY.length > 0;

/** base64url (how VAPID keys are published) -> Uint8Array (what PushManager wants). */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  // Allocate the ArrayBuffer explicitly: PushManager.subscribe wants a
  // BufferSource backed by ArrayBuffer, not the wider ArrayBufferLike that
  // `new Uint8Array(length)` infers under TS 5.7+.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** ArrayBuffer -> base64 string, for the p256dh/auth subscription keys. */
function bufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

/**
 * Stable, collision-resistant doc id for an endpoint. Uses SubtleCrypto when
 * available (all push-capable browsers have it in a secure context) and falls
 * back to a cheap string hash otherwise.
 */
export async function endpointId(endpoint: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
    return Array.from(new Uint8Array(digest))
      .slice(0, 16)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 0;
  for (let i = 0; i < endpoint.length; i++) h = (h * 31 + endpoint.charCodeAt(i)) | 0;
  return `fallback-${Math.abs(h)}`;
}

export interface StoredPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
  createdAt: Timestamp;
}

/** Serialize a PushSubscription into the shape the push-service expects. */
export function serializeSubscription(sub: PushSubscription): Omit<StoredPushSubscription, "createdAt"> {
  return {
    endpoint: sub.endpoint,
    p256dh: bufferToBase64(sub.getKey("p256dh")),
    auth: bufferToBase64(sub.getKey("auth")),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
}

export async function saveSubscription(userId: string, sub: PushSubscription): Promise<void> {
  const id = await endpointId(sub.endpoint);
  await setDoc(doc(db, "users", userId, "pushSubscriptions", id), {
    ...serializeSubscription(sub),
    createdAt: Timestamp.now(),
  });
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  const id = await endpointId(endpoint);
  await deleteDoc(doc(db, "users", userId, "pushSubscriptions", id));
}
