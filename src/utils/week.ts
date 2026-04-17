/**
 * Get the current week based on Wednesday 8pm ET locks.
 * Week 0 = before season. Week 1 = premiere/scouting week.
 * Week 2+ = scoring weeks (each begins after the prior Wednesday 8pm ET lock).
 *
 * Kept dependency-free so it can be imported from both client and server code
 * (e.g. Vercel cron handlers) without pulling in the client Firebase SDK.
 */
export const getCurrentWeek = (seasonStartDate: Date): number => {
  const now = new Date();

  if (now < seasonStartDate) {
    return 0;
  }

  const wednesdayEightPm = new Date(seasonStartDate);
  wednesdayEightPm.setHours(20, 0, 0, 0);

  let weekOffset = 0;
  let currentWeekDeadline = new Date(wednesdayEightPm);

  while (now > currentWeekDeadline) {
    weekOffset++;
    currentWeekDeadline = new Date(wednesdayEightPm);
    currentWeekDeadline.setDate(wednesdayEightPm.getDate() + 7 * weekOffset);
  }

  return weekOffset;
};
