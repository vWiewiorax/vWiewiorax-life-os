"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/profile";
import { localInputToISO } from "@/lib/dates";
import { academicKindLabel } from "@/lib/labels";
import { academicItemSchema, classSessionSchema, subjectSchema, zodError, type ActionResult } from "@/lib/validation";
import { clearReminders, scheduleReminders } from "@/server/reminders";

const refresh = () => revalidatePath("/", "layout");

export async function saveSubject(input: z.input<typeof subjectSchema>, id?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const { supabase } = await getProfile();
  const q = id
    ? supabase.from("subjects").update(parsed.data).eq("id", id).select("id").single()
    : supabase.from("subjects").insert(parsed.data).select("id").single();
  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateSubjectProgress(id: string, progress: number): Promise<ActionResult> {
  const value = Math.max(0, Math.min(100, Math.round(progress)));
  const { supabase } = await getProfile();
  const { error } = await supabase.from("subjects").update({ progress: value }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { data: files } = await supabase.from("study_materials").select("storage_path").eq("subject_id", id);
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  // Materials keep living without a subject (FK set null); files stay. Nothing else to clean up.
  void files;
  refresh();
  return { ok: true };
}

export async function addClassSession(input: z.input<typeof classSessionSchema>): Promise<ActionResult> {
  const parsed = classSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  if (parsed.data.end_time <= parsed.data.start_time) return { ok: false, error: "Koniec zajęć musi być po początku." };
  const { supabase } = await getProfile();
  const { error } = await supabase.from("class_sessions").insert(parsed.data);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteClassSession(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("class_sessions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function saveAcademicItem(input: z.input<typeof academicItemSchema>, id?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = academicItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const { supabase, user, tz } = await getProfile();
  const { reminder_offsets, custom_reminder, due_at, ...rest } = parsed.data;
  const row = { ...rest, due_at: localInputToISO(due_at, tz) };
  const { data, error } = id
    ? await supabase.from("academic_items").update(row).eq("id", id).select("id, subject_id").single()
    : await supabase.from("academic_items").insert(row).select("id, subject_id").single();
  if (error) return { ok: false, error: error.message };

  await scheduleReminders(supabase, user.id, { type: "academic_item", id: data.id }, {
    title: `${academicKindLabel(row.kind)}: ${row.title}`,
    body: "Zbliża się termin. Sprawdź, co zostało do przygotowania.",
    url: "/uczelnia",
    targetIso: row.due_at,
    offsets: reminder_offsets,
    custom: custom_reminder,
    tz,
  });
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function toggleAcademicItem(id: string, completed: boolean): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase
    .from("academic_items")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (completed) await clearReminders(supabase, "academic_item", id);
  refresh();
  return { ok: true };
}

export async function deleteAcademicItem(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  await clearReminders(supabase, "academic_item", id);
  const { error } = await supabase.from("academic_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
