/**
 * Survivor Fantasy League service worker — hand-authored, served as a static file.
 *
 * WHY THIS IS NOT GENERATED
 * -------------------------
 * The project used to wrap next.config.js in `next-pwa@5.6`, which emits a
 * Workbox-built sw.js from a webpack plugin. next-pwa requires a standalone
 * `webpack` module; Next 16 builds with Turbopack and no longer provides one, so
 * the plugin's hook never runs and no service worker was ever emitted. The build
 * still succeeded, which is why this went unnoticed — the app has been shipping
 * without a service worker.
 *
 * Push notifications need a real, registered service worker, so this file is
 * written by hand and registered by src/components/ServiceWorkerRegistrar.tsx.
 * Keep it dependency-free and plain ES5-ish: nothing compiles it.
 */

const OFFLINE_URL = "/offline.html";
const OFFLINE_CACHE = "sfl-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Navigation-only offline fallback. Deliberately does NOT cache app assets or
 * API responses: this app is Firestore-backed and read-heavy, and a stale cache
 * would show wrong scores, which is worse than a spinner.
 */
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((res) => res || Response.error()),
    ),
  );
});

/**
 * Web Push. The Railway push-service sends:
 *   { title, body, link, tag, notificationId }
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { title: "Survivor Fantasy League", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Survivor Fantasy League", {
      body: payload.body || "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      // Collapses repeats (two score updates) into one lock-screen entry
      // instead of stacking them.
      tag: payload.tag || "sfl-general",
      renotify: true,
      data: {
        link: payload.link || "/dashboard",
        notificationId: payload.notificationId || null,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus and route an existing tab rather than opening a duplicate.
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(link);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    }),
  );
});
