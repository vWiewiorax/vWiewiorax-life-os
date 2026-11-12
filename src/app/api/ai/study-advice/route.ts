import { NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/supabase/server";
import { buildUserContext } from "@/lib/ai/context";
import { BASE_PERSONA, aiErrorMessage, chatText } from "@/lib/ai/openai";
import { DEFAULT_TZ } from "@/lib/dates";

export const maxDuration = 60;

export async function POST() {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const { supabase, user } = auth;
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  try {
    const context = await buildUserContext(supabase, { tz: profile?.timezone ?? DEFAULT_TZ, days: 30 });
    const content = await chatText([
      {
        role: "system",
        content: `${BASE_PERSONA}
Jesteś doradcą nauki. Przeanalizuj nadchodzące egzaminy, kolokwia, zadania i projekty z najbliższych 30 dni.
Odpowiedz w Markdown:
1. Jedno zdanie podsumowania (ile zaliczeń i kiedy).
2. "Kolejność nauki" - lista numerowana przedmiotów/terminów od najpilniejszego, każdy z krótkim uzasadnieniem (termin, priorytet, szacowany czas przygotowania, postęp w przedmiocie).
3. "Na dziś" - jeden konkretny krok z liczbą minut.
Nie wymyślaj terminów, których nie ma w danych. Jeśli nie ma żadnych terminów, napisz to i zasugeruj, co dodać.`,
      },
      { role: "user", content: context },
    ]);
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ error: aiErrorMessage(e) }, { status: 502 });
  }
}
