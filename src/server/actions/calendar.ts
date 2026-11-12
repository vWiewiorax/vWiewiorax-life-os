"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/profile";
import { zonedToUtcISO } from "@/lib/dates";
import { eventSchema, zodError, type ActionResult } from "@/lib/validation";

export async function saveEvent(input: z.input<typeof eventSchema>, id?: string): Promise<ActionResult> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const { supabase, tz } = await getProfile();
  const { date, start_time, end_time, all_day, ...rest } = parsed.data;
  if (!all_day && !start_time) return { ok: false, error: "Podaj godzinę rozpoczęcia albo zaznacz cały dzień." };
  const starts_at = zonedToUtcISO(date, all_day ? "00:00" : start_time!, tz);
  const ends_at = !all_day && end_time ? zonedToUtcISO(date, end_time, tz) : null;
  if (ends_at && ends_at <= starts_at) return { ok: false, error: "Koniec musi być po początku." };
  const row = { ...rest, all_day, starts_at, ends_at };
  const { error } = id ? await supabase.from("calendar_events").update(row).eq("id", id) : await supabase.from("calendar_events").insert(row);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
