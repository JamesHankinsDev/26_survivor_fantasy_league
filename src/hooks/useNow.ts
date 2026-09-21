"use client";

import { useSyncExternalStore } from "react";

/**
 * The wall clock, exposed as a React external store.
 *
 * Reading `Date.now()` during render is impure: React may re-run render at any
 * time, so the value is neither stable across a render pass nor guaranteed to
 * refresh afterwards. Anything rendering "time until X" needs the clock to be a
 * *subscription*, or the text goes stale the moment it first paints.
 *
 * The snapshot is cached and only advances when the interval fires — returning
 * a fresh `Date.now()` from `getSnapshot` would re-render forever, since
 * useSyncExternalStore compares snapshots with Object.is.
 */
const RESOLUTION_MS = 30_000;

let snapshot = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  snapshot = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (timer === null) {
    // Prime the snapshot without notifying: React re-reads it right after
    // subscribing and re-renders if it moved.
    snapshot = Date.now();
    timer = setInterval(tick, RESOLUTION_MS);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => 0;

/**
 * Current epoch milliseconds, refreshed every 30s.
 *
 * Returns `0` during SSR and the very first client render, before the
 * subscription is live. Treat `0` as "clock not ready yet", not as 1970.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
