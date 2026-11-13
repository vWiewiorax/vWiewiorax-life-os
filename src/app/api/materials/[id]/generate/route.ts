import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/supabase/server";
import { aiErrorMessage } from "@/lib/ai/openai";
import { NOTE_MODES, generateFlashcards, generateNote, generateQuiz, sourceForPrompt, type NoteMode } from "@/lib/materials/generate";
import { processMaterial } from "@/lib/materials/process";

export const maxDuration = 300;

const input = z.object({
  mode: z.enum(["lecture_notes", "summary", "exam_prep", "explanation", "flashcards", "quiz", "reprocess"]),
  topic: z.string().max(1000).optional(),
  count: z.number().int().min(3).max(40).optional(),
});

export async function POST(request: Request, ctx: RouteContext<"/api/materials/[id]/generate">) {
  const { id } = await ctx.params;
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Niepoprawne dane." }, { status: 400 });
  const { supabase, user } = auth;
  const { mode, topic, count } = parsed.data;
  const { data: m } = await supabase.from("study_materials").select("id,title,subject_id,extracted_text,status").eq("id", id).maybeSingle();
  if (!m) return NextResponse.json({ error: "Nie znaleziono materiału." }, { status: 404 });

  if (mode === "reprocess") {
    await supabase.from("study_materials").update({ status: "processing", error: null }).eq("id", id);
    after(() => processMaterial(id, user.id));
    return NextResponse.json({ ok: true });
  }
  if (!m.extracted_text) return NextResponse.json({ error: "Materiał nie został jeszcze przetworzony." }, { status: 409 });
  if (mode === "explanation" && !topic?.trim()) return NextResponse.json({ error: "Podaj temat do wyjaśnienia." }, { status: 400 });

  try {
    const source = await sourceForPrompt(m.extracted_text);
    if (mode === "flashcards") {
      const cards = await generateFlashcards(source, count ?? 20, topic);
      const { error } = await supabase.from("flashcards").insert(cards.map((c) => ({ ...c, material_id: m.id, subject_id: m.subject_id })));
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, count: cards.length });
    }
    if (mode === "quiz") {
      const quiz = await generateQuiz(source, count ?? 10, topic);
      const { data, error } = await supabase.from("quizzes").insert({ title: quiz.title, questions: quiz.questions, material_id: m.id, subject_id: m.subject_id }).select("id").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, quizId: data.id });
    }
    const content = await generateNote(mode as NoteMode, source, topic);
    const title = mode === "explanation" ? `Wyjaśnienie: ${topic}` : `${NOTE_MODES[mode as NoteMode].title}: ${m.title}`;
    const { data, error } = await supabase.from("ai_notes").insert({ kind: mode, title: title.slice(0, 300), content, material_id: m.id, subject_id: m.subject_id }).select("id").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, noteId: data.id });
  } catch (e) {
    return NextResponse.json({ error: aiErrorMessage(e) }, { status: 502 });
  }
}
