"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/profile";
import { addDays, localInputToISO, todayKey, weekdayOf, addMonths } from "@/lib/dates";
import { taskSchema, timeBlockSchema, zodError, type ActionResult } from "@/lib/validation";
import type { Recurrence } from "@/lib/labels";
import { clearReminders, scheduleReminders } from "@/server/reminders";

const refresh = () => revalidatePath("/", "layout");

function nextOccurrence(from: string, rule: Recurrence) {
  switch (rule) {
    case "daily":
      return addDays(from, 1);
    case "weekdays": {
      let d = addDays(from, 1);
      while (weekdayOf(d) > 5) d = addDays(d, 1);
      return d;
    }
    case "weekly":
      return addDays(from, 7);
    case "monthly": {
      const day = Number(from.slice(8, 10));
      const base = addMonths(from, 1);
      const lastDay = Number(addDays(addMonths(base, 1), -1).slice(8, 10));
      return base.slice(0, 8) + String(Math.min(day, lastDay)).padStart(2, "0");
    }
    default:
      return null;
  }
}

export async function saveTask(input: z.input<typeof taskSchema>, id?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const { supabase, user, tz } = await getProfile();
  const { reminder_offsets, custom_reminder, due_at, ...rest } = parsed.data;
  const row = {
    ...rest,
    due_at: due_at ? localInputToISO(due_at, tz) : null,
    scheduled_date: rest.scheduled_date ?? (rest.recurrence !== "none" ? todayKey(tz) : null),
  };
  const { data, error } = id
    ? await supabase.from("tasks").update(row).eq("id", id).select("id").single()
    : await supabase.from("tasks").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };

  await scheduleReminders(supabase, user.id, { type: "task", id: data.id }, {
    title: `Zadanie: ${row.title}`,
    body: row.due_at ? "Zbliża się termin zadania." : undefined,
    url: "/planer",
    targetIso: row.due_at,
    offsets: reminder_offsets,
    custom: custom_reminder,
    tz,
  });
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function setTaskDone(id: string, done: boolean): Promise<ActionResult> {
  const { supabase, tz } = await getProfile();
  const { data: task, error } = await supabase
    .from("tasks")
    .update({ status: done ? "done" : "todo", completed_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  if (done) {
    await clearReminders(supabase, "task", id);
    if (task.recurrence !== "none") {
      const sourceId = task.recurrence_source_id ?? task.id;
      const next = nextOccurrence(task.scheduled_date ?? todayKey(tz), task.recurrence);
      if (next) {
        const { count } = await supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .or(`id.eq.${sourceId},recurrence_source_id.eq.${sourceId}`)
          .eq("scheduled_date", next);
        if (!count) {
          await supabase.from("tasks").insert({
            title: task.title,
            description: task.description,
            category: task.category,
            priority: task.priority,
            estimated_minutes: task.estimated_minutes,
            recurrence: task.recurrence,
            recurrence_source_id: sourceId,
            scheduled_date: next,
            subject_id: task.subject_id,
            goal_id: task.goal_id,
          });
        }
      }
    }
  }
  refresh();
  return { ok: true };
}

export async function postponeTasks(ids: string[], toDate?: string): Promise<ActionResult<{ count: number }>> {
  if (!ids.length) return { ok: true, data: { count: 0 } };
  const { supabase, user, tz } = await getProfile();
  const target = toDate ?? addDays(todayKey(tz), 1);
  const { data: tasks, error } = await supabase.from("tasks").select("id,title,postponed_count").in("id", ids);
  if (error) return { ok: false, error: error.message };
  for (const t of tasks ?? []) {
    const count = t.postponed_count + 1;
    await supabase.from("tasks").update({ scheduled_date: target, postponed_count: count }).eq("id", t.id);
    if (count === 3 || count === 6) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: `Odkładasz "${t.title}" już ${count} razy`,
        body: "Może warto podzielić to zadanie na mniejsze kroki albo zdecydować, czy jest nadal potrzebne.",
        url: "/planer",
        scheduled_for: new Date().toISOString(),
        source_type: "task",
        source_id: t.id,
        channels: ["push", "in_app"],
      });
    }
  }
  refresh();
  return { ok: true, data: { count: tasks?.length ?? 0 } };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  await clearReminders(supabase, "task", id);
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

const blocksInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  replace: z.boolean().default(false),
  remind: z.boolean().default(false),
  blocks: z.array(timeBlockSchema.omit({ block_date: true })).max(40),
});

export async function saveTimeBlocks(input: z.input<typeof blocksInput>): Promise<ActionResult<{ count: number }>> {
  const parsed = blocksInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const { supabase, user, tz } = await getProfile();
  const { date, blocks, replace, remind } = parsed.data;
  const invalid = blocks.find((b) => b.end_time <= b.start_time);
  if (invalid) return { ok: false, error: `Blok "${invalid.title}" kończy się przed początkiem.` };

  if (replace) {
    const { data: old } = await supabase.from("time_blocks").select("id").eq("block_date", date);
    for (const b of old ?? []) await clearReminders(supabase, "time_block", b.id);
    await supabase.from("time_blocks").delete().eq("block_date", date);
  }
  const { data, error } = await supabase
    .from("time_blocks")
    .insert(blocks.map((b) => ({ ...b, block_date: date })))
    .select("id,title,start_time,kind");
  if (error) return { ok: false, error: error.message };

  if (remind) {
    for (const b of data ?? []) {
      if (b.kind === "break" || b.kind === "class") continue;
      await scheduleReminders(supabase, user.id, { type: "time_block", id: b.id }, {
        title: `Za 10 minut: ${b.title}`,
        body: `Start o ${b.start_time.slice(0, 5)}.`,
        url: "/planer",
        targetIso: localInputToISO(`${date}T${b.start_time.slice(0, 5)}`, tz),
        offsets: [10],
        tz,
      });
    }
  }
  refresh();
  return { ok: true, data: { count: data?.length ?? 0 } };
}

export async function deleteTimeBlock(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  await clearReminders(supabase, "time_block", id);
  const { error } = await supabase.from("time_blocks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function addQuickNote(content: string): Promise<ActionResult> {
  const text = content.trim();
  if (!text) return { ok: false, error: "Notatka jest pusta." };
  if (text.length > 5000) return { ok: false, error: "Notatka jest za długa." };
  const { supabase } = await getProfile();
  const { error } = await supabase.from("quick_notes").insert({ content: text });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteQuickNote(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("quick_notes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
