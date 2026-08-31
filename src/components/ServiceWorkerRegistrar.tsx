"use client";

import { useEffect } from "react";
import { swLogger } from "@/lib/logger";

/**
 * Registers /sw.js on load.
 *
 * next-pwa used to inject this (with `register: true`), but it no longer runs
 * under Next 16 + Turbopack — see the header comment in public/sw.js. Push
 * notifications need a registered service worker, so registration is explicit
 * now. Mounted once from the root layout.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Registering from localhost is allowed and useful for testing push; any
    // other insecure origin will reject, so don't bother trying.
    if (!window.isSecureContext) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => swLogger.info("Service worker registered:", reg.scope))
      .catch((err) => swLogger.error("Service worker registration failed:", err));
  }, []);

  return null;
}
