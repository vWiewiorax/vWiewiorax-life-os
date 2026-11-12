"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/profile";
import { goalSchema, habitSchema, zodError, type ActionResult } from "@/lib/validation";
import { scheduleReminders, clearReminders } from "@/server/reminders";
import { zonedToUtcISO } from "@/lib/dates";

const refresh = () => revalidatePath("/", "layout");

export async function saveGoal(input: z.input<typeof goalSchema>, id?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const { supabase, user, tz } = await getProfile();
  const { data, error } = id
    ? await supabase.from("goals").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("goals").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: error.message };
  await scheduleReminders(supabase, user.id, { type: "goal", id: data.id }, {
    title: `Cel: ${parsed.data.title}`,
    body: "Za tydzień mija termin celu. Dobry moment na przegląd postępów.",
    url: `/cele/${data.id}`,
    targetIso: parsed.data.target_date && parsed.data.status === "active" ? zonedToUtcISO(parsed.data.target_date, "09:00", tz) : null,
    offsets: [10080],
    tz,
  });
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  await clearReminders(supabase, "goal", id);
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Recomputes goal progress from milestones (only when the goal has milestones). */
async function syncGoalProgress(goalId: string) {
  const { supabase } = await getProfile();
  const { data } = await supabase.from("milestones").select("done").eq("goal_id", goalId);
  if (!data?.length) return;
  const progress = Math.round((data.filter((m) => m.done).length / data.length) * 100);
  await supabase.from("goals").update({ progress }).eq("id", goalId);
}

export async function setGoalProgress(id: string, progress: number): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("goals").update({ progress: Math.max(0, Math.min(100, Math.round(progress))) }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function addMilestones(goalId: string, items: { title: string; due_date?: string | null }[]): Promise<ActionResult> {
  const clean = items.map((i) => ({ title: i.title.trim().slice(0, 300), due_date: i.due_date || null })).filter((i) => i.title);
  if (!clean.length) return { ok: false, error: "Podaj nazwę kroku." };
  const { supabase } = await getProfile();
  const { count } = await supabase.from("milestones").select("id", { count: "exact", head: true }).eq("goal_id", goalId);
  const { error } = await supabase.from("milestones").insert(clean.map((m, i) => ({ ...m, goal_id: goalId, position: (count ?? 0) + i })));
  if (error) return { ok: false, error: error.message };
  await syncGoalProgress(goalId);
  refresh();
  return { ok: true };
}

export async function toggleMilestone(id: string, done: boolean): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { data, error } = await supabase
    .from("milestones")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select("goal_id")
    .single();
  if (error) return { ok: false, error: error.message };
  await syncGoalProgress(data.goal_id);
  refresh();
  return { ok: true };
}

export async function deleteMilestone(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { data, error } = await supabase.from("milestones").delete().eq("id", id).select("goal_id").single();
  if (error) return { ok: false, error: error.message };
  await syncGoalProgress(data.goal_id);
  refresh();
  return { ok: true };
}

export async function addGoalReflection(goalId: string, content: string): Promise<ActionResult> {
  const text = content.trim();
  if (!text) return { ok: false, error: "Wpis jest pusty." };
  const { supabase } = await getProfile();
  const { error } = await supabase.from("goal_reflections").insert({ goal_id: goalId, content: text.slice(0, 20000) });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteGoalReflection(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("goal_reflections").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function saveHabit(input: z.input<typeof habitSchema>, id?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = habitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const row = { ...parsed.data, target_per_week: parsed.data.frequency === "daily" ? 7 : parsed.data.target_per_week };
  const { supabase } = await getProfile();
  const { data, error } = id
    ? await supabase.from("habits").update(row).eq("id", id).select("id").single()
    : await supabase.from("habits").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function archiveHabit(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("habits").update({ archived: true }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteHabit(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function setHabitEntry(habitId: string, date: string, done: boolean, note?: string | null): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Zła data." };
  const { supabase } = await getProfile();
  if (!done && note === undefined) {
    const { error } = await supabase.from("habit_entries").delete().eq("habit_id", habitId).eq("entry_date", date);
    if (error) return { ok: false, error: error.message };
  } else {
    const row: { habit_id: string; entry_date: string; done: boolean; note?: string | null } = { habit_id: habitId, entry_date: date, done };
    if (note !== undefined) row.note = note?.trim().slice(0, 2000) || null;
    const { error } = await supabase.from("habit_entries").upsert(row, { onConflict: "habit_id,entry_date" });
    if (error) return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true };
}
