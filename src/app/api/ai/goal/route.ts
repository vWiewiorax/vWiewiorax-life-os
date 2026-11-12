import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/supabase/server";
import { BASE_PERSONA, aiErrorMessage, chatJSON, chatText } from "@/lib/ai/openai";
import { DEFAULT_TZ, todayKey } from "@/lib/dates";

export const maxDuration = 90;

const input = z.object({ goal_id: z.uuid(), mode: z.enum(["breakdown", "review", "obstacles", "define"]), message: z.string().max(3000).optional() });
const breakdown = z.object({
  intro: z.string(),
  milestones: z.array(z.object({ title: z.string().min(1).max(300), due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional() })).min(1).max(15),
  questions: z.array(z.string()).max(5).default([]),
});

const PARTNER = `Jesteś uważnym partnerem w rozwoju osobistym, nie generatorem cytatów motywacyjnych. Zadajesz konkretne, otwarte pytania, które pomagają myśleć samodzielnie. Jesteś szczery: jeśli cel jest nierealny albo niejasny, mówisz to łagodnie i proponujesz alternatywę.`;

export async function POST(request: Request) {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Niepoprawne dane." }, { status: 400 });
  const { supabase, user } = auth;
  const { goal_id, mode, message } = parsed.data;
  const [{ data: goal }, milestones, reflections, habits, profile] = await Promise.all([
    supabase.from("goals").select("*").eq("id", goal_id).maybeSingle(),
    supabase.from("milestones").select("title,due_date,done").eq("goal_id", goal_id).order("position"),
    supabase.from("goal_reflections").select("content,created_at").eq("goal_id", goal_id).order("created_at", { ascending: false }).limit(10),
    supabase.from("habits").select("id,title,frequency,target_per_week").eq("goal_id", goal_id),
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
  ]);
  if (!goal) return NextResponse.json({ error: "Nie znaleziono celu." }, { status: 404 });
  const today = todayKey(profile.data?.timezone ?? DEFAULT_TZ);
  const habitIds = (habits.data ?? []).map((h) => h.id);
  const entries = habitIds.length ? await supabase.from("habit_entries").select("habit_id,entry_date").in("habit_id", habitIds).eq("done", true).gte("entry_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)) : { data: [] };

  const snapshot = `Dzisiaj: ${today}
CEL: ${goal.title} (kategoria: ${goal.category}, priorytet: ${goal.priority}, status: ${goal.status}, postęp: ${goal.progress}%, termin: ${goal.target_date ?? "brak"}, utworzony: ${goal.created_at.slice(0, 10)})
Opis: ${goal.description ?? "-"}
Dlaczego ważny: ${goal.why ?? "-"}
Kroki: ${JSON.stringify(milestones.data ?? [])}
Powiązane nawyki: ${JSON.stringify((habits.data ?? []).map((h) => ({ ...h, wykonania_30_dni: (entries.data ?? []).filter((e) => e.habit_id === h.id).length })))}
Ostatnie refleksje: ${JSON.stringify(reflections.data ?? [])}
${message ? `Wiadomość użytkownika: ${message}` : ""}`;

  try {
    if (mode === "breakdown") {
      const res = await chatJSON(
        [
          { role: "system", content: `${BASE_PERSONA}\n${PARTNER}\nRozbij cel na 3-10 konkretnych, mierzalnych kroków (kamieni milowych) w kolejności realizacji, z realistycznymi datami (YYYY-MM-DD, nie wcześniej niż dziś i nie później niż termin celu, jeśli jest). Pomiń kroki, które już istnieją. Zwróć JSON {"intro": "1-2 zdania o logice planu", "milestones": [{"title", "due_date"}], "questions": ["maks. 3 pytania doprecyzowujące"]}.` },
          { role: "user", content: snapshot },
        ],
        breakdown,
      );
      return NextResponse.json(res);
    }
    const prompts = {
      review: `Zrób przegląd postępu w tym celu: co idzie dobrze, gdzie jest zastój (np. nawyki, przeterminowane kroki), czy tempo pozwoli zdążyć na termin. Zaproponuj 1-3 konkretne korekty. Zakończ 2-3 pytaniami do przemyślenia. Markdown, zwięźle.`,
      obstacles: `Pomóż zidentyfikować przeszkody: wypisz prawdopodobne przeszkody (wewnętrzne i zewnętrzne) na podstawie danych i refleksji, dla każdej zaproponuj plan "jeśli X, to zrobię Y". Jeśli widać spadek motywacji, zaproponuj zmniejszenie skali zamiast presji. Markdown.`,
      define: `Pomóż doprecyzować cel: oceń, czy jest konkretny, mierzalny i realistyczny. Zaproponuj lepsze sformułowanie, kryterium sukcesu i pierwszy krok na najbliższe 48 godzin. Zadaj 3 pytania, które pomogą użytkownikowi lepiej zrozumieć, czemu mu na nim zależy. Markdown.`,
    } as const;
    const content = await chatText([
      { role: "system", content: `${BASE_PERSONA}\n${PARTNER}\n${prompts[mode]}` },
      { role: "user", content: snapshot },
    ]);
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ error: aiErrorMessage(e) }, { status: 502 });
  }
}
