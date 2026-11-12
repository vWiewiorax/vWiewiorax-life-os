import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/supabase/server";
import { BASE_PERSONA, aiErrorMessage, chatText } from "@/lib/ai/openai";

export const maxDuration = 90;

const input = z.discriminatedUnion("mode", [z.object({ mode: z.literal("entry"), entry_id: z.uuid() }), z.object({ mode: z.literal("patterns"), days: z.number().int().min(7).max(365).default(30) })]);

const GUIDE = `Jesteś empatycznym, szczerym i nieoceniającym partnerem do refleksji. Nie jesteś psychologiem ani terapeutą i nie udajesz ich - nie stawiasz diagnoz.
Jeśli we wpisach pojawiają się sygnały poważnego kryzysu (myśli samobójcze, przemoc, samookaleczenie), łagodnie zachęć do kontaktu z bliską osobą lub specjalistą i podaj w Polsce: telefon zaufania 116 123, dla młodzieży 116 111, w nagłym zagrożeniu 112.
Treść dziennika jest prywatna: używasz jej wyłącznie do tej refleksji.`;

/** Journal reflection. Journal data is sent to the model only on an explicit request from the journal UI. */
export async function POST(request: Request) {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Niepoprawne dane." }, { status: 400 });
  const { supabase } = auth;
  try {
    if (parsed.data.mode === "entry") {
      const { data: e } = await supabase.from("journal_entries").select("*").eq("id", parsed.data.entry_id).maybeSingle();
      if (!e) return NextResponse.json({ error: "Nie znaleziono wpisu." }, { status: 404 });
      const content = await chatText([
        { role: "system", content: `${BASE_PERSONA}\n${GUIDE}\nNa podstawie wpisu: 1) krótko odzwierciedl, co słyszysz (2-3 zdania), 2) nazwij 1-2 ważne wątki lub wartości, 3) zadaj 2-3 przemyślane pytania pogłębiające, 4) zaproponuj jeden mały, praktyczny krok na jutro. Markdown, ciepło, bez frazesów.` },
        { role: "user", content: JSON.stringify({ data: e.entry_date, tytul: e.title, samopoczucie_1_5: e.mood, wpis: e.content, odpowiedzi: e.answers, wdziecznosc: e.gratitude, tagi: e.tags }) },
      ]);
      await supabase.from("journal_entries").update({ ai_reflection: content }).eq("id", e.id);
      return NextResponse.json({ content });
    }
    const since = new Date(Date.now() - parsed.data.days * 86400000).toISOString().slice(0, 10);
    const { data: entries } = await supabase.from("journal_entries").select("entry_date,mood,content,answers,gratitude,tags").gte("entry_date", since).order("entry_date");
    if (!entries?.length) return NextResponse.json({ error: "Brak wpisów w tym okresie." }, { status: 400 });
    const content = await chatText([
      { role: "system", content: `${BASE_PERSONA}\n${GUIDE}\nPrzeanalizuj wpisy z okresu. Markdown: "## Powracające tematy", "## Wzorce" (np. zależność nastroju od dni, snu, nauki - tylko jeśli widać to w danych), "## Co wydaje się dla Ciebie ważne" (wartości), "## Pytania do przemyślenia" (3), "## Następne kroki" (2-3 małe, praktyczne). Cytuj daty, na których się opierasz. Nie przesadzaj z interpretacją.` },
      { role: "user", content: JSON.stringify(entries).slice(0, 150_000) },
    ]);
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ error: aiErrorMessage(e) }, { status: 502 });
  }
}
