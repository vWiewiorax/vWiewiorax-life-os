import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/supabase/server";
import { BASE_PERSONA, aiErrorMessage, chatText, embed } from "@/lib/ai/openai";

export const maxDuration = 120;

const input = z.object({
  question: z.string().trim().min(1).max(2000),
  material_id: z.uuid().nullable().optional(),
  subject_id: z.uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Niepoprawne dane." }, { status: 400 });
  const { supabase } = auth;
  const { question, material_id, subject_id } = parsed.data;
  try {
    const [vector] = await embed([question]);
    const { data: chunks, error } = await supabase.rpc("match_material_chunks", {
      query_embedding: JSON.stringify(vector),
      match_count: 8,
      filter_subject: subject_id ?? undefined,
      filter_material: material_id ?? undefined,
    });
    if (error) throw new Error(error.message);
    const relevant = (chunks ?? []).filter((c) => c.similarity > 0.2);
    const context = relevant.map((c, i) => `[${i + 1}] (${c.material_title})\n${c.content}`).join("\n\n---\n\n");
    const content = await chatText([
      {
        role: "system",
        content: `${BASE_PERSONA}
Odpowiadasz na pytanie na podstawie fragmentów materiałów użytkownika. Powołuj się na fragmenty w formacie [1], [2].
Jeśli materiały nie zawierają odpowiedzi lub zawierają ją tylko częściowo, powiedz to wprost i oddziel uzupełnienie nagłówkiem "**Spoza Twoich materiałów (wiedza ogólna):**".
Format: Markdown, zwięźle.`,
      },
      { role: "user", content: `Pytanie: ${question}\n\nFRAGMENTY MATERIAŁÓW:\n${context || "(brak pasujących fragmentów)"}` },
    ]);
    const sources = relevant.map((c, i) => ({ n: i + 1, material_id: c.material_id, title: c.material_title, similarity: c.similarity }));
    return NextResponse.json({ content, sources });
  } catch (e) {
    return NextResponse.json({ error: aiErrorMessage(e) }, { status: 502 });
  }
}
