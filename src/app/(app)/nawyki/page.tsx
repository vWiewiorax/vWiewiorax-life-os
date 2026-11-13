import type { Metadata } from "next";
import { Plus, Repeat } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { features } from "@/lib/env";
import { addDays, todayKey, weekdayOf, WEEKDAY_SHORT } from "@/lib/dates";
import { habitStreak } from "@/lib/habits";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/shared/page-header";
import { AiPanel } from "@/components/shared/ai-panel";
import { HabitDialog } from "@/components/habits/habit-dialog";
import { HabitRow } from "@/components/habits/habit-row";

export const metadata: Metadata = { title: "Nawyki" };

export default async function HabitsPage() {
  const { supabase, tz } = await getProfile();
  const today = todayKey(tz);
  const [habits, entries, goals] = await Promise.all([
    supabase.from("habits").select("*").eq("archived", false).order("created_at"),
    supabase.from("habit_entries").select("habit_id,entry_date,done,note").gte("entry_date", addDays(today, -90)),
    supabase.from("goals").select("id,title").eq("status", "active").order("title"),
  ]);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((key) => ({ key, label: `${WEEKDAY_SHORT[weekdayOf(key) - 1]}\n${Number(key.slice(8))}`.split("\n")[1] }));
  return (
    <div>
      <PageHeader title="Nawyki" description="Małe, regularne kroki. Kliknij dzień, żeby oznaczyć wykonanie." actions={<HabitDialog goals={goals.data ?? []} trigger={<Button><Plus /> Nawyk</Button>} />} />
      <div className="grid gap-6">
        {!habits.data?.length ? (
          <EmptyState icon={Repeat} title="Brak nawyków" description="Zacznij od 1-3 nawyków, np. czytanie 20 minut, godzina nauki, sen przed 23:00." />
        ) : (
          <div className="grid gap-3">
            {habits.data.map((h) => {
              const own = (entries.data ?? []).filter((e) => e.habit_id === h.id);
              const map = Object.fromEntries(own.map((e) => [e.entry_date, { done: e.done, note: e.note }]));
              const doneSet = new Set(own.filter((e) => e.done).map((e) => e.entry_date));
              const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, -i)).filter((d) => doneSet.has(d)).length;
              const expected = h.frequency === "daily" ? 30 : Math.round((h.target_per_week * 30) / 7);
              return (
                <HabitRow
                  key={h.id}
                  habit={h}
                  days={days}
                  entries={map}
                  today={today}
                  streak={habitStreak(doneSet, today, h.frequency, h.target_per_week)}
                  rate={Math.min(100, Math.round((last30 / expected) * 100))}
                  goals={goals.data ?? []}
                />
              );
            })}
          </div>
        )}
        <AiPanel endpoint="/api/ai/habits" title="Coach nawyków" description="AI przeanalizuje ostatnie 30 dni i zaproponuje realistyczne korekty, bez przeładowania." buttonLabel="Przeanalizuj nawyki" aiEnabled={features.ai} />
      </div>
    </div>
  );
}
