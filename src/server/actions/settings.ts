"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/profile";
import { customReminderSchema, profileSchema, zodError, type ActionResult } from "@/lib/validation";
import { localInputToISO } from "@/lib/dates";

export async function saveProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  try {
    new Intl.DateTimeFormat("pl-PL", { timeZone: parsed.data.timezone });
  } catch {
    return { ok: false, error: "Nieznana strefa czasowa." };
  }
  const { supabase, user } = await getProfile();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createCustomReminder(input: z.input<typeof customReminderSchema>): Promise<ActionResult> {
  const parsed = customReminderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const { supabase, tz } = await getProfile();
  const scheduled_for = localInputToISO(parsed.data.scheduled_for, tz);
  if (Date.parse(scheduled_for) < Date.now() - 60_000) return { ok: false, error: "Ta data już minęła." };
  const { error } = await supabase.from("notifications").insert({ title: parsed.data.title, body: parsed.data.body, scheduled_for, source_type: "custom" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).not("sent_at", "is", null).is("read_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
