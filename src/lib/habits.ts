import { addDays, startOfWeek } from "@/lib/dates";

/** Current streak: consecutive days (daily) or weeks meeting the target (weekly) ending today/this week. */
export function habitStreak(doneDates: Set<string>, today: string, frequency: "daily" | "weekly", targetPerWeek: number) {
  if (frequency === "daily") {
    let streak = 0;
    let d = doneDates.has(today) ? today : addDays(today, -1);
    while (doneDates.has(d)) {
      streak++;
      d = addDays(d, -1);
    }
    return streak;
  }
  let streak = 0;
  let week = startOfWeek(today);
  const count = (w: string) => [0, 1, 2, 3, 4, 5, 6].filter((i) => doneDates.has(addDays(w, i))).length;
  if (count(week) < targetPerWeek) week = addDays(week, -7);
  while (count(week) >= targetPerWeek) {
    streak++;
    week = addDays(week, -7);
  }
  return streak;
}
