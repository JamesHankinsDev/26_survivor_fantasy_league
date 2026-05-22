/**
 * Vercel Cron target: weekly roster lock.
 *
 * Runs Thursday 00:00 UTC and Thursday 01:00 UTC so at least one firing lands
 * on or just after Wednesday 8pm ET under both EST and EDT. The handler is
 * idempotent: each league member's weeklyRoster for the current week is only
 * written if an entry for that week does not yet exist — so a second firing
 * (or a manual admin lock earlier in the day) will not overwrite snapshots.
 *
 * Auth: Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET`
 * when the CRON_SECRET project env var is set. Local calls must supply the
 * same header manually.
 */
import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { CURRENT_SEASON, isSeasonActive } from "@/data/seasons";
import { getCurrentWeek } from "@/utils/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LockResult {
  leagueId: string;
  leagueName: string;
  locked: number;
  skipped: number;
}

interface WeeklyRosterSnapshot {
  week: number;
  castawayIds: string[];
  weekScore: number;
  lockedAt: Timestamp;
}

interface MemberLike {
  roster?: unknown;
  weeklyRosters?: WeeklyRosterSnapshot[];
  [key: string]: unknown;
}

function normalizeRoster(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];

  // Legacy RosterEntry[] shape: { castawayId, status }
  if (typeof raw[0] === "object" && raw[0] !== null && "castawayId" in (raw[0] as object)) {
    return (raw as Array<{ castawayId: string; status?: string }>)
      .filter((r) => r.status === "active")
      .map((r) => r.castawayId);
  }

  return (raw as string[]).filter((id) => typeof id === "string");
}

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSeasonActive()) {
    return NextResponse.json({
      success: true,
      message: "Season has concluded — roster locks disabled",
      season: CURRENT_SEASON.number,
      concludedAt: CURRENT_SEASON.concludedAt,
      leaguesProcessed: 0,
    });
  }

  const premiereDate = new Date(CURRENT_SEASON.premiereDate);
  const currentWeek = getCurrentWeek(premiereDate);

  if (currentWeek < 1) {
    return NextResponse.json({
      success: true,
      message: "Season has not started",
      season: CURRENT_SEASON.number,
      currentWeek,
      leaguesProcessed: 0,
    });
  }

  const db = getAdminFirestore();
  const leaguesSnap = await db
    .collection("leagues")
    .where("status", "==", "active")
    .get();

  const now = Timestamp.now();
  const results: LockResult[] = [];

  for (const leagueDoc of leaguesSnap.docs) {
    const league = leagueDoc.data();
    const members: MemberLike[] = Array.isArray(league.memberDetails)
      ? league.memberDetails
      : [];

    let locked = 0;
    let skipped = 0;

    const updatedMembers = members.map((member) => {
      const weeklyRosters = Array.isArray(member.weeklyRosters)
        ? [...member.weeklyRosters]
        : [];

      const existing = weeklyRosters.find((w) => w.week === currentWeek);
      if (existing) {
        skipped++;
        return member;
      }

      const snapshot: WeeklyRosterSnapshot = {
        week: currentWeek,
        castawayIds: normalizeRoster(member.roster),
        weekScore: 0,
        lockedAt: now,
      };

      locked++;
      return { ...member, weeklyRosters: [...weeklyRosters, snapshot] };
    });

    if (locked > 0) {
      await leagueDoc.ref.update({
        memberDetails: updatedMembers,
        updatedAt: now,
      });
    }

    results.push({
      leagueId: leagueDoc.id,
      leagueName: typeof league.name === "string" ? league.name : "",
      locked,
      skipped,
    });
  }

  return NextResponse.json({
    success: true,
    season: CURRENT_SEASON.number,
    week: currentWeek,
    leaguesProcessed: results.length,
    totalLocked: results.reduce((s, r) => s + r.locked, 0),
    totalSkipped: results.reduce((s, r) => s + r.skipped, 0),
    results,
  });
}
