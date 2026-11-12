import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/supabase/server";
import { buildUserContext } from "@/lib/ai/context";
import { BASE_PERSONA, aiErrorMessage, chatJSON } from "@/lib/ai/openai";
import { DEFAULT_TZ, weekdayOf } from "@/lib/dates";

export const maxDuration = 90;

const input = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), prompt: z.string().max(2000).default("") });
const time = z.string().regex(/^\d{2}:\d{2}$/);
const output = z.object({
  summary: z.string(),
  blocks: z
    .array(
      z.object({
        start_time: time,
        end_time: time,
        title: z.string().min(1).max(200),
        kind: z.enum(["focus", "study", "class", "break", "personal"]),
        task_id: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .max(30),
});

export async function POST(request: Request) {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Niepoprawne dane." }, { status: 400 });
  const { supabase, user } = auth;
  const { date, prompt } = parsed.data;
  const { data: profile } = await supabase.from("profiles").select("timezone,day_start,day_end").eq("id", user.id).single();
  const tz = profile?.timezone ?? DEFAULT_TZ;

  const [classes, tasks, events] = await Promise.all([
    supabase.from("class_sessions").select("start_time,end_time,kind,location,subjects(name)").eq("weekday", weekdayOf(date)),
    supabase.from("tasks").select("id,title,priority,estimated_minutes,status").or(`scheduled_date.eq.${date},and(scheduled_date.lt.${date},status.in.(todo,in_progress))`),
    supabase.from("calendar_events").select("title,starts_at,ends_at,all_day").gte("starts_at", `${date}T00:00:00Z`).lte("starts_at", `${date}T23:59:59Z`),
  ]);

  try {
    const context = await buildUserContext(supabase, { tz, days: 14 });
    const result = await chatJSON(
      [
        {
          role: "system",
          content: `${BASE_PERSONA}
Układasz realistyczny plan dnia ${date} w blokach czasu. Zwróć JSON: {"summary": string, "blocks": [{"start_time":"HH:MM","end_time":"HH:MM","title":string,"kind":"focus|study|class|break|personal","task_id":string|null,"notes":string|null}]}.
Zasady:
- Zajęcia na uczelni z planu wpisz jako bloki "class" w ich godzinach i nie planuj na nie nic innego.
- Planuj w godzinach ${profile?.day_start?.slice(0, 5) ?? "07:00"}-${profile?.day_end?.slice(0, 5) ?? "23:00"}, chyba że użytkownik poda inaczej.
- Bloki nie mogą na siebie nachodzić, posortuj je chronologicznie.
- Nauka do najbliższych egzaminów ma pierwszeństwo, bloki nauki 25-90 min, z przerwami (kind "break") co 60-120 min, uwzględnij posiłki i dojazdy.
- Nie przeładowuj dnia: zostaw bufor. Jeśli zadań jest za dużo, wybierz najważniejsze i napisz w summary, co przesunąć.
- Jeśli blok realizuje konkretne zadanie, ustaw task_id na jego ID z danych.
- summary: 2-3 zdania po polsku o logice planu.`,
        },
        {
          role: "user",
          content: `Prośba użytkownika: ${prompt || "(brak - zaplanuj na podstawie danych)"}

Zajęcia w tym dniu: ${JSON.stringify(classes.data ?? [])}
Zadania na ten dzień i zaległe: ${JSON.stringify(tasks.data ?? [])}
Wydarzenia w kalendarzu: ${JSON.stringify(events.data ?? [])}

${context}`,
        },
      ],
      output,
    );
    const taskIds = new Set((tasks.data ?? []).map((t) => t.id));
    const blocks = result.blocks
      .filter((b) => b.end_time > b.start_time)
      .map((b) => ({ ...b, task_id: b.task_id && taskIds.has(b.task_id) ? b.task_id : null }))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return NextResponse.json({ summary: result.summary, blocks });
  } catch (e) {
    return NextResponse.json({ error: aiErrorMessage(e) }, { status: 502 });
  }
}
