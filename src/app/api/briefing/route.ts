import { NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/supabase/server";
import { buildUserContext } from "@/lib/ai/context";
import { BASE_PERSONA, aiErrorMessage, chatText } from "@/lib/ai/openai";
import { DEFAULT_TZ, todayKey } from "@/lib/dates";

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const { supabase, user } = auth;
  const { force } = (await request.json().catch(() => ({}))) as { force?: boolean };
  const { data: profile } = await supabase.from("profiles").select("timezone,display_name").eq("id", user.id).single();
  const tz = profile?.timezone ?? DEFAULT_TZ;
  const today = todayKey(tz);

  if (!force) {
    const { data } = await supabase.from("daily_briefings").select("content").eq("briefing_date", today).maybeSingle();
    if (data) return NextResponse.json({ content: data.content });
  }

  try {
    const context = await buildUserContext(supabase, { tz, days: 14 });
    const content = await chatText([
      {
        role: "system",
        content: `${BASE_PERSONA}
Przygotuj krótkie poranne podsumowanie dnia dla ${profile?.display_name ?? "użytkownika"} (3-5 zdań, bez nagłówków i list).
Wskaż najważniejsze zadania na dziś, najbliższe zaliczenia (z liczbą dni) i jedną konkretną rekomendację, ile czasu i na co poświęcić dziś na naukę.
Jeśli są zaległe lub często odkładane zadania, wspomnij o nich rzeczowo. Jeśli danych jest mało, powiedz, co warto dodać, żeby plan był trafniejszy.
Przykład tonu: "Masz dzisiaj 3 ważne zadania. Za 4 dni masz kolokwium z matematyki, dlatego warto poświęcić dzisiaj 45 minut na powtórkę."`,
      },
      { role: "user", content: context },
    ]);
    await supabase.from("daily_briefings").upsert({ briefing_date: today, content, user_id: user.id }, { onConflict: "user_id,briefing_date" });
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ error: aiErrorMessage(e) }, { status: 502 });
  }
}
