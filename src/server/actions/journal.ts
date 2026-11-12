"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/profile";
import { journalSchema, zodError, type ActionResult } from "@/lib/validation";

export async function saveJournalEntry(input: z.input<typeof journalSchema>, id?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = journalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const { supabase } = await getProfile();
  const { data, error } = id
    ? await supabase.from("journal_entries").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("journal_entries").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dziennik", "layout");
  return { ok: true, data: { id: data.id } };
}

export async function deleteJournalEntry(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dziennik", "layout");
  return { ok: true };
}
