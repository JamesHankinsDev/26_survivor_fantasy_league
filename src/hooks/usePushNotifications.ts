"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  VAPID_PUBLIC_KEY,
  isPushSupported,
  removeSubscription,
  saveSubscription,
  urlBase64ToUint8Array,
} from "@/lib/push";
import { dbLogger } from "@/lib/logger";

export type PushStatus =
  | "unsupported" // no SW / Push API, or no VAPID key configured
  | "denied" // user blocked notifications at the browser level
  | "off" // supported and permitted, but not subscribed
  | "on"; // subscribed on this device

interface UsePushNotificationsResult {
  status: PushStatus;
  /** True while a subscribe/unsubscribe round-trip is in flight. */
  isBusy: boolean;
  /** Non-null when the last action failed, for surfacing in the UI. */
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

/**
 * Per-device push subscription state.
 *
 * Push is a *device* capability, not an account setting — subscribing on a
 * phone says nothing about a laptop — so the toggle reflects only the browser
 * it is rendered in. Enabling elsewhere adds a second subscription doc, and the
 * push-service fans out to every one it finds.
 *
 * Demo mode is inert: there is no real user to attach a subscription to.
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const { user, isDemoMode } = useAuth();
  const [status, setStatus] = useState<PushStatus>("unsupported");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve the current state on mount: permission + whether this browser
  // already holds a subscription for our service worker.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isPushSupported() || isDemoMode || !user) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (!cancelled) setStatus(existing ? "on" : "off");
      } catch (err) {
        dbLogger.error("Failed to read push subscription:", err);
        if (!cancelled) setStatus("off");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isDemoMode]);

  const enable = useCallback(async () => {
    if (!user || !isPushSupported()) return;
    setIsBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      // Reuse an existing subscription when present — calling subscribe() twice
      // with the same key returns the same endpoint, but this avoids the round
      // trip and any chance of a re-key.
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      await saveSubscription(user.uid, sub);
      setStatus("on");
    } catch (err) {
      dbLogger.error("Failed to enable push notifications:", err);
      setError("Couldn't turn on notifications on this device.");
      setStatus("off");
    } finally {
      setIsBusy(false);
    }
  }, [user]);

  const disable = useCallback(async () => {
    if (!user || !isPushSupported()) return;
    setIsBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Drop the stored doc first: if unsubscribe() succeeds but the delete
        // fails, the service would keep pushing to a dead endpoint until its
        // next 410 prune.
        await removeSubscription(user.uid, sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (err) {
      dbLogger.error("Failed to disable push notifications:", err);
      setError("Couldn't turn off notifications on this device.");
    } finally {
      setIsBusy(false);
    }
  }, [user]);

  return { status, isBusy, error, enable, disable };
}
