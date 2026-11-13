"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/profile";
import { zodError, type ActionResult } from "@/lib/validation";

const noteSchema = z.object({
  title: z.string().trim().min(1, "Podaj tytuł").max(300),
  content: z.string().max(400000),
  subject_id: z.uuid().nullable().optional(),
});

export async function saveNote(input: z.input<typeof noteSchema>, id?: string): Promise<ActionResult<{ id: string }>> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const { supabase } = await getProfile();
  const { data, error } = id
    ? await supabase.from("ai_notes").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("ai_notes").insert({ ...parsed.data, kind: "manual" }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/materialy", "layout");
  return { ok: true, data: { id: data.id } };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("ai_notes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/materialy", "layout");
  return { ok: true };
}

export async function deleteMaterial(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { data } = await supabase.from("study_materials").select("storage_path").eq("id", id).single();
  if (data?.storage_path) await supabase.storage.from("materials").remove([data.storage_path]);
  const { error } = await supabase.from("study_materials").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/materialy", "layout");
  return { ok: true };
}

export async function updateMaterial(id: string, input: { title: string; subject_id: string | null }): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Podaj tytuł." };
  const { supabase } = await getProfile();
  const { error } = await supabase.from("study_materials").update({ title: title.slice(0, 300), subject_id: input.subject_id || null }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/materialy", "layout");
  return { ok: true };
}

export async function reviewFlashcard(id: string, known: boolean): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { data: card, error } = await supabase.from("flashcards").select("box,review_count").eq("id", id).single();
  if (error) return { ok: false, error: error.message };
  const box = known ? Math.min(5, card.box + 1) : 1;
  const intervalDays = [0, 1, 2, 4, 8, 16][box];
  const due = new Date(Date.now() + (known ? intervalDays : 0) * 86_400_000 + (known ? 0 : 10 * 60_000));
  const { error: e2 } = await supabase
    .from("flashcards")
    .update({ box, due_at: due.toISOString(), review_count: card.review_count + 1 })
    .eq("id", id);
  if (e2) return { ok: false, error: e2.message };
  return { ok: true };
}

export async function deleteFlashcard(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("flashcards").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/materialy", "layout");
  return { ok: true };
}

export async function saveQuizAttempt(quizId: string, answers: number[]): Promise<ActionResult<{ score: number; total: number }>> {
  const { supabase } = await getProfile();
  const { data: quiz, error } = await supabase.from("quizzes").select("questions").eq("id", quizId).single();
  if (error) return { ok: false, error: error.message };
  const questions = quiz.questions as { correct_index: number }[];
  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_index ? 1 : 0), 0);
  const { error: e2 } = await supabase.from("quiz_attempts").insert({ quiz_id: quizId, answers, score, total: questions.length });
  if (e2) return { ok: false, error: e2.message };
  revalidatePath("/materialy", "layout");
  return { ok: true, data: { score, total: questions.length } };
}

export async function deleteQuiz(id: string): Promise<ActionResult> {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("quizzes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/materialy", "layout");
  return { ok: true };
}
