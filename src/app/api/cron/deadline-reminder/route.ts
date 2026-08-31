/**
 * Vercel Cron target: weekly add/drop deadline reminder.
 *
 * Runs Wednesday 22:00 UTC (6pm EDT / 5pm EST), roughly two hours before the
 * Wednesday 8pm ET roster lock that /api/cron/lock-rosters enforces. Writes one
 * in-app notification per member of every active league in the current season;
 * the Railway push-service turns each into a phone notification.
 *
 * Idempotent per (league, week): a marker on the league doc records the last
 * week reminded, so a re-run in the same week is a no-op rather than a second
 * buzz. Members whose roster is already full are skipped — the reminder is for
 * people who still have moves to make.
 *
 * Auth: same CRON_SECRET bearer token as lock-rosters.
 */
import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { SeasonOverride, applySeasonOverrides } from "@/data/seasons";
import { getCurrentWeek } from "@/utils/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROSTER_SIZE = 5;

interface MemberLike {
  userId?: string;
  displayName?: string;
  roster?: unknown;
  [key: string]: unknown;
}

function rosterCount(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  if (raw.length === 0) return 0;
  if (typeof raw[0] === "object" && raw[0] !== null && "castawayId" in (raw[0] as object)) {
    return (raw as Array<{ status?: string }>).filter((r) => r.status === "active").length;
  }
  return (raw as unknown[]).filter((id) => typeof id === "string").length;
}

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminFirestore();

  const overridesSnap = await db.collection("seasonOverrides").get();
  const overridesMap: Record<number, SeasonOverride> = {};
  overridesSnap.forEach((d) => {
    const n = parseInt(d.id, 10);
    if (Number.isNaN(n)) return;
    overridesMap[n] = d.data() as SeasonOverride;
  });

  const activeSeason = applySeasonOverrides(overridesMap).find((s) => s.isActive);
  if (!activeSeason) {
    return NextResponse.json({ success: true, message: "No active season", remindersSent: 0 });
  }

  const currentWeek = getCurrentWeek(new Date(activeSeason.premiereDate));
  if (currentWeek < 1) {
    return NextResponse.json({
      success: true,
      message: "Season has not started",
      season: activeSeason.number,
      currentWeek,
      remindersSent: 0,
    });
  }

  const leaguesSnap = await db
    .collection("leagues")
    .where("status", "==", "active")
    .where("seasonNumber", "==", activeSeason.number)
    .get();

  let remindersSent = 0;
  const leaguesNotified: string[] = [];

  for (const leagueDoc of leaguesSnap.docs) {
    const league = leagueDoc.data();

    // Skip a league already reminded for this week.
    if (league.lastDeadlineReminderWeek === currentWeek) continue;

    const members: MemberLike[] = Array.isArray(league.memberDetails) ? league.memberDetails : [];
    const needsMoves = members.filter(
      (m) => typeof m.userId === "string" && rosterCount(m.roster) < ROSTER_SIZE,
    );

    const batch = db.batch();
    for (const member of needsMoves) {
      const ref = db.collection("users").doc(member.userId as string).collection("notifications").doc();
      const missing = ROSTER_SIZE - rosterCount(member.roster);
      batch.set(ref, {
        userId: member.userId,
        type: "score_update",
        title: "Rosters lock tonight",
        message:
          missing === ROSTER_SIZE
            ? `You haven't set a tribe in ${league.name}. Rosters lock at 8pm ET.`
            : `You're ${missing} short in ${league.name}. Rosters lock at 8pm ET.`,
        link: `/dashboard/my-leagues/${leagueDoc.id}`,
        read: false,
        createdAt: Timestamp.now(),
        metadata: { leagueId: leagueDoc.id, leagueName: league.name ?? "", week: String(currentWeek) },
        // Deadline reminders are time-critical — never hold these back.
        push: {
          state: "pending",
          sendAfter: Timestamp.now(),
          tag: `deadline-${leagueDoc.id}`,
        },
      });
      remindersSent++;
    }

    batch.update(leagueDoc.ref, { lastDeadlineReminderWeek: currentWeek });
    await batch.commit();
    if (needsMoves.length > 0) leaguesNotified.push(league.name ?? leagueDoc.id);
  }

  return NextResponse.json({
    success: true,
    season: activeSeason.number,
    currentWeek,
    leaguesProcessed: leaguesSnap.size,
    leaguesNotified,
    remindersSent,
  });
}
