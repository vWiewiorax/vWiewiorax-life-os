import { NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/supabase/server";
import { BASE_PERSONA, aiErrorMessage, chatText } from "@/lib/ai/openai";
import { DEFAULT_TZ, addDays, todayKey } from "@/lib/dates";

export const maxDuration = 60;

export async function POST() {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const { supabase, user } = auth;
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  const today = todayKey(profile?.timezone ?? DEFAULT_TZ);
  const [habits, entries] = await Promise.all([
    supabase.from("habits").select("id,title,frequency,target_per_week,created_at,goals(title)").eq("archived", false),
    supabase.from("habit_entries").select("habit_id,entry_date,done,note").gte("entry_date", addDays(today, -30)),
  ]);
  const data = (habits.data ?? []).map((h) => ({
    nawyk: h.title,
    czestotliwosc: h.frequency === "daily" ? "codziennie" : `${h.target_per_week}x/tydz.`,
    od: h.created_at.slice(0, 10),
    cel: (h.goals as { title: string } | null)?.title ?? null,
    wykonane_dni: (entries.data ?? []).filter((e) => e.habit_id === h.id && e.done).map((e) => e.entry_date),
    notatki: (entries.data ?? []).filter((e) => e.habit_id === h.id && e.note).map((e) => `${e.entry_date}: ${e.note}`),
  }));
  try {
    const content = await chatText([
      {
        role: "system",
        content: `${BASE_PERSONA}
Jesteś coachem nawyków. Na podstawie danych z 30 dni (dziś ${today}): oceń, które nawyki są stabilne, a które się sypią (i w jakie dni tygodnia).
Zaproponuj maks. 3 konkretne zmiany: zmniejszenie skali, zmiana pory, łączenie z istniejącą rutyną (habit stacking), usunięcie nawyku. Nie dokładaj nowych nawyków, jeśli obecne nie działają.
Jeśli nawyków nie ma, zaproponuj 2-3 proste nawyki startowe dla studenta i jak zacząć. Markdown, zwięźle.`,
      },
      { role: "user", content: JSON.stringify(data) },
    ]);
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ error: aiErrorMessage(e) }, { status: 502 });
  }
}
