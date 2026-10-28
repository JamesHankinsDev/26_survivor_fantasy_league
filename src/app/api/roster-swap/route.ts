/**
 * Apply a roster swap the user confirmed from the AI assistant's proposal card.
 *
 * The chat route can only *propose*; this is the only write path. It re-runs
 * every rule server-side inside a transaction, because the admin SDK bypasses
 * `firestore.rules` and the request body is client-controlled. Like
 * `useRosterSwap`, it writes the working roster only — the Wednesday lock cron
 * snapshots it into `weeklyRosters`, which is what scoring reads.
 */
import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  LeagueDataSource,
  getRequestUid,
  normalizeLeague,
  swapBlockedReason,
} from "@/lib/server/leagueData";
import { normalizeMember } from "@/utils/normalizeMember";
import { validateRosterSwap } from "@/utils/rosterSwap";
import type { RosterSwapRequestBody, RosterSwapResponse } from "@/types/chat";
import { apiLogger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (error: string, status: number) =>
  NextResponse.json<RosterSwapResponse>({ ok: false, error }, { status });

const isIdOrNull = (v: unknown): v is string | null =>
  v === null || (typeof v === "string" && v.length > 0 && v.length <= 128);

export async function POST(request: NextRequest) {
  const uid = await getRequestUid(request);
  if (!uid) return fail("Please sign in again.", 401);

  let body: RosterSwapRequestBody;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }
  if (
    typeof body?.leagueId !== "string" ||
    !isIdOrNull(body.dropId) ||
    !isIdOrNull(body.addId)
  ) {
    return fail("Invalid request.", 400);
  }

  const db = getAdminFirestore();
  const data = new LeagueDataSource(db, uid);
  const leagueRef = db.collection("leagues").doc(body.leagueId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(leagueRef);
      if (!snap.exists) return { ok: false as const, error: "League not found." };

      const raw = snap.data()!;
      const league = normalizeLeague(snap.id, raw);
      const memberIdx = league.memberDetails.findIndex((m) => m.userId === uid);
      if (!league.members?.includes(uid) || memberIdx === -1) {
        return { ok: false as const, error: "You're not a member of that league." };
      }
      const member = league.memberDetails[memberIdx];

      const { ctx, state } = await data.swapContext(league, member);
      const blocked = swapBlockedReason(league, state);
      if (blocked) return { ok: false as const, error: blocked };

      const validated = validateRosterSwap(body.dropId, body.addId, ctx);
      if (!validated.ok) return validated;

      // Replace only this member's `roster`, keeping every other stored field
      // exactly as it was (the normalized copy adds fallbacks we don't persist).
      const rawMembers: unknown[] = Array.isArray(raw.memberDetails) ? raw.memberDetails : [];
      const updatedMembers = rawMembers.map((m) =>
        normalizeMember(m).userId === uid
          ? { ...(m as object), roster: validated.roster }
          : m,
      );
      tx.update(leagueRef, { memberDetails: updatedMembers, updatedAt: Timestamp.now() });
      return validated;
    });

    return NextResponse.json<RosterSwapResponse>(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    apiLogger.error("roster-swap failed", err);
    return fail("Couldn't save that swap. Try again.", 500);
  }
}
