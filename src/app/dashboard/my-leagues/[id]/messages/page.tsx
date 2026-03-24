"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

/**
 * Legacy messages page — message board is now in the global drawer.
 * Redirects to the league detail page.
 */
export default function LeagueMessagesRedirect() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;

  useEffect(() => {
    router.replace(`/dashboard/my-leagues/${leagueId}`);
  }, [router, leagueId]);

  return null;
}
