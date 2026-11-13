import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import { addDays, formatWeekday, todayKey, toDateKey, toTimeKey, relativeDays } from "@/lib/dates";
import { academicKindLabel, goalCategoryLabel, priorityLabel, WEEKDAYS } from "@/lib/labels";

type Options = { tz: string; includeJournal?: boolean; days?: number };

/** Builds a compact, plain-text snapshot of the user's data for AI prompts. */
export async function buildUserContext(supabase: ServerSupabase, opts: Options) {
  const { tz } = opts;
  const today = todayKey(tz);
  const horizon = addDays(today, opts.days ?? 21);
  const nowIso = new Date().toISOString();

  const [subjects, sessions, items, tasks, overdue, blocks, events, goals, habits, entries, journal] = await Promise.all([
    supabase.from("subjects").select("id,name,progress,professor").eq("archived", false),
    supabase.from("class_sessions").select("subject_id,kind,weekday,start_time,end_time,location"),
    supabase
      .from("academic_items")
      .select("id,kind,title,due_at,priority,completed,subject_id,estimated_prep_minutes")
      .eq("completed", false)
      .lte("due_at", new Date(Date.parse(horizon + "T23:59:59Z")).toISOString())
      .order("due_at"),
    supabase
      .from("tasks")
      .select("id,title,priority,status,scheduled_date,due_at,estimated_minutes,category,postponed_count")
      .gte("scheduled_date", today)
      .lte("scheduled_date", addDays(today, 7))
      .neq("status", "cancelled")
      .order("scheduled_date"),
    supabase
      .from("tasks")
      .select("id,title,priority,scheduled_date,postponed_count")
      .lt("scheduled_date", today)
      .in("status", ["todo", "in_progress"])
      .limit(20),
    supabase.from("time_blocks").select("block_date,start_time,end_time,title,kind").gte("block_date", today).lte("block_date", addDays(today, 7)).order("block_date").order("start_time"),
    supabase.from("calendar_events").select("title,starts_at,ends_at,all_day,location").gte("starts_at", nowIso).lte("starts_at", new Date(Date.parse(horizon + "T23:59:59Z")).toISOString()).order("starts_at").limit(30),
    supabase.from("goals").select("id,title,category,progress,target_date,priority,why,milestones(title,done,due_date)").eq("status", "active"),
    supabase.from("habits").select("id,title,frequency,target_per_week").eq("archived", false),
    supabase.from("habit_entries").select("habit_id,entry_date,done").gte("entry_date", addDays(today, -13)),
    opts.includeJournal
      ? supabase.from("journal_entries").select("entry_date,title,mood,content,answers,gratitude").order("entry_date", { ascending: false }).limit(10)
      : Promise.resolve({ data: null }),
  ]);

  const subjectName = new Map((subjects.data ?? []).map((s) => [s.id, s.name]));
  const lines: string[] = [];
  lines.push(`Dzisiaj: ${formatWeekday(today)}, ${today}, godzina ${toTimeKey(new Date(), tz)} (strefa ${tz}).`);

  lines.push("\n## Przedmioty");
  if (!subjects.data?.length) lines.push("(brak)");
  for (const s of subjects.data ?? []) lines.push(`- ${s.name} [id ${s.id}] - postęp ${s.progress}%${s.professor ? `, prowadzący: ${s.professor}` : ""}`);

  lines.push("\n## Plan zajęć (co tydzień)");
  if (!sessions.data?.length) lines.push("(brak)");
  for (const c of [...(sessions.data ?? [])].sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)))
    lines.push(`- ${WEEKDAYS[c.weekday - 1]} ${c.start_time.slice(0, 5)}-${c.end_time.slice(0, 5)}: ${subjectName.get(c.subject_id) ?? "?"} (${c.kind})${c.location ? `, ${c.location}` : ""}`);

  lines.push("\n## Nadchodzące zaliczenia i terminy");
  if (!items.data?.length) lines.push("(brak)");
  for (const i of items.data ?? []) {
    const key = toDateKey(i.due_at, tz);
    lines.push(
      `- ${academicKindLabel(i.kind)}: ${i.title}${i.subject_id ? ` (${subjectName.get(i.subject_id) ?? ""})` : ""} - ${key} ${toTimeKey(i.due_at, tz)}, ${relativeDays(key, today)}, priorytet ${priorityLabel(i.priority)}${i.estimated_prep_minutes ? `, szac. przygotowanie ${i.estimated_prep_minutes} min` : ""} [id ${i.id}]`,
    );
  }

  lines.push("\n## Zadania (najbliższe 7 dni)");
  if (!tasks.data?.length) lines.push("(brak)");
  for (const t of tasks.data ?? [])
    lines.push(`- [${t.status === "done" ? "x" : " "}] ${t.title} - ${t.scheduled_date}, priorytet ${priorityLabel(t.priority)}${t.estimated_minutes ? `, ${t.estimated_minutes} min` : ""}${t.category ? `, kategoria ${t.category}` : ""}${t.postponed_count >= 2 ? `, odkładane ${t.postponed_count} razy` : ""} [id ${t.id}]`);
  if (overdue.data?.length) {
    lines.push("\n## Zaległe, niedokończone zadania");
    for (const t of overdue.data) lines.push(`- ${t.title} (zaplanowane na ${t.scheduled_date}, odkładane ${t.postponed_count} razy) [id ${t.id}]`);
  }

  if (blocks.data?.length) {
    lines.push("\n## Zaplanowane bloki czasu");
    for (const b of blocks.data) lines.push(`- ${b.block_date} ${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}: ${b.title} (${b.kind})`);
  }
  if (events.data?.length) {
    lines.push("\n## Wydarzenia w kalendarzu");
    for (const e of events.data) lines.push(`- ${toDateKey(e.starts_at, tz)} ${e.all_day ? "(cały dzień)" : toTimeKey(e.starts_at, tz)}: ${e.title}${e.location ? `, ${e.location}` : ""}`);
  }

  lines.push("\n## Aktywne cele");
  if (!goals.data?.length) lines.push("(brak)");
  for (const g of goals.data ?? []) {
    const ms = (g.milestones ?? []) as { title: string; done: boolean; due_date: string | null }[];
    lines.push(`- ${g.title} (${goalCategoryLabel(g.category)}) - postęp ${g.progress}%${g.target_date ? `, termin ${g.target_date}` : ""} [id ${g.id}]${g.why ? `\n  Dlaczego: ${g.why}` : ""}`);
    for (const m of ms) lines.push(`  - [${m.done ? "x" : " "}] ${m.title}${m.due_date ? ` (do ${m.due_date})` : ""}`);
  }

  lines.push("\n## Nawyki (ostatnie 14 dni)");
  if (!habits.data?.length) lines.push("(brak)");
  for (const h of habits.data ?? []) {
    const done = (entries.data ?? []).filter((e) => e.habit_id === h.id && e.done);
    const todayDone = done.some((e) => e.entry_date === today);
    lines.push(`- ${h.title} (${h.frequency === "daily" ? "codziennie" : `${h.target_per_week}x w tygodniu`}): wykonano ${done.length}/14 dni, dzisiaj ${todayDone ? "zrobione" : "jeszcze nie"}`);
  }

  if (journal.data?.length) {
    lines.push("\n## Ostatnie wpisy w dzienniku (użytkownik wyraźnie udostępnił je w tej rozmowie)");
    for (const j of journal.data) {
      const answers = Object.values((j.answers ?? {}) as Record<string, string>).filter(Boolean).join(" | ");
      lines.push(`- ${j.entry_date}${j.mood ? `, nastrój ${j.mood}/5` : ""}${j.title ? `: ${j.title}` : ""}\n  ${[j.content, answers, j.gratitude].filter(Boolean).join(" | ").slice(0, 1200)}`);
    }
  }

  return lines.join("\n");
}
