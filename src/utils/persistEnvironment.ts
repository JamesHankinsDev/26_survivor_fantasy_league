/**
 * Where is this build actually running?
 *
 * Progress flags that are meant to fire **once per person, ever** (the
 * how-to-play walkthrough) must not be burned by a developer poking at the app
 * on localhost — the same Firebase project backs dev and prod, so a local write
 * would mark the real account as "seen" and nobody could re-check the feel.
 *
 * So: read freely everywhere, write only from production.
 */

/** Hostnames that are never production. */
function isLocalHostname(host: string): boolean {
  if (!host) return true;
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".localhost")) return true;
  // `next dev --hostname 0.0.0.0` reached from a phone on the same wifi.
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

/**
 * True only in the deployed production environment.
 *
 * `NEXT_PUBLIC_VERCEL_ENV` is the authoritative signal when Vercel's system
 * environment variables are exposed — it's "production" | "preview" |
 * "development", so preview deployments are correctly excluded too. Without it
 * we fall back to hostname inspection.
 *
 * Both arguments are injectable so this is testable without a DOM or a build.
 */
export function isProductionRuntime(
  vercelEnv: string | undefined = process.env.NEXT_PUBLIC_VERCEL_ENV,
  hostname: string | undefined = typeof window !== "undefined"
    ? window.location.hostname
    : undefined,
): boolean {
  if (vercelEnv) return vercelEnv === "production";
  if (hostname == null) return false; // SSR with no Vercel signal — don't write.
  return !isLocalHostname(hostname.toLowerCase());
}

/**
 * Should a one-shot "user has seen this" flag be written right now?
 *
 * Gate every such persist on this. On localhost it returns false, which means
 * the walkthrough replays on every load — exactly what you want while tuning
 * how it feels.
 */
export const shouldPersistSeenFlags = (): boolean => isProductionRuntime();
