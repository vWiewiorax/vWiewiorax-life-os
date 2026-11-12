"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/profile";
import type { ActionResult } from "@/lib/validation";

export async function deleteConversation(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/asystent");
  return { ok: true };
}
