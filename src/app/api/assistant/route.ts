import { NextResponse } from "next/server";
import { z } from "zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getUserOrNull } from "@/lib/supabase/server";
import { BASE_PERSONA, aiErrorMessage, embed, getOpenAI, models } from "@/lib/ai/openai";
import { buildUserContext } from "@/lib/ai/context";
import { ACTIONS, SEARCH_TOOL, toolDefinitions, type ActionName, type PendingAction } from "@/lib/ai/assistant-tools";
import { DEFAULT_TZ, formatWeekday, todayKey, toTimeKey } from "@/lib/dates";
import type { Json } from "@/lib/supabase/database.types";

export const maxDuration = 120;

const input = z.object({ conversation_id: z.uuid().nullable().optional(), message: z.string().trim().min(1).max(8000), include_journal: z.boolean().default(false) });

export async function POST(request: Request) {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Niepoprawne dane." }, { status: 400 });
  const { supabase, user } = auth;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const tz = profile?.timezone || DEFAULT_TZ;
  const includeJournal = parsed.data.include_journal && !!profile?.ai_journal_access;

  let conversationId = parsed.data.conversation_id ?? null;
  if (conversationId) {
    const { data } = await supabase.from("ai_conversations").select("id").eq("id", conversationId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Nie znaleziono rozmowy." }, { status: 404 });
    await supabase.from("ai_conversations").update({ include_journal: includeJournal }).eq("id", conversationId);
  } else {
    const { data, error } = await supabase.from("ai_conversations").insert({ title: parsed.data.message.slice(0, 80), include_journal: includeJournal }).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    conversationId = data.id;
  }
  await supabase.from("ai_messages").insert({ conversation_id: conversationId, role: "user", content: parsed.data.message });

  const { data: history } = await supabase.from("ai_messages").select("role,content,pending_actions").eq("conversation_id", conversationId).in("role", ["user", "assistant"]).order("created_at", { ascending: false }).limit(30);
  const past: ChatCompletionMessageParam[] = (history ?? []).reverse().map((m) => {
    const actions = (m.pending_actions as PendingAction[] | null) ?? [];
    const note = actions.length ? `\n[Zaproponowane akcje: ${actions.map((a) => `${a.label} (${a.status})`).join(", ")}]` : "";
    return { role: m.role as "user" | "assistant", content: m.content + note };
  });

  const ctx = profile?.ai_context_enabled === false ? "Użytkownik wyłączył dostęp asystenta do danych aplikacji." : await buildUserContext(supabase, { tz, includeJournal });
  const today = todayKey(tz);
  const system = `${BASE_PERSONA}
Jesteś głównym asystentem użytkownika: pomagasz planować dzień i tydzień, uczyć się, realizować cele i podejmować decyzje.
Teraz: ${formatWeekday(today)} ${today}, ${toTimeKey(new Date(), tz)} (${tz}).
Możesz proponować akcje w aplikacji przez narzędzia (zadania, wydarzenia, terminy, notatki, cele, przypomnienia). Każda akcja zostanie pokazana użytkownikowi do potwierdzenia - nie twierdź, że już ją wykonałeś. Używaj prawdziwych ID z kontekstu. Daty podawaj w czasie lokalnym użytkownika.
Gdy pytanie dotyczy treści materiałów do nauki, użyj ${SEARCH_TOOL} i cytuj źródła. Wiedzę spoza materiałów oznaczaj jako "(wiedza ogólna)".
W rozmowach o rozwoju i karierze zadawaj pytania, które pomagają myśleć samodzielnie. Nie jesteś psychologiem ani terapeutą.
${includeJournal ? "Masz dostęp do ostatnich wpisów z dziennika - traktuj je dyskretnie i odwołuj się do nich tylko, gdy to pomocne." : "Nie masz dostępu do dziennika w tej rozmowie."}

DANE UŻYTKOWNIKA:
${ctx}`;

  const messages: ChatCompletionMessageParam[] = [{ role: "system", content: system }, ...past];
  const pending: PendingAction[] = [];
  try {
    const openai = getOpenAI();
    let content = "";
    for (let step = 0; step < 4; step++) {
      const res = await openai.chat.completions.create({ model: models.chat(), messages, tools: toolDefinitions() });
      const msg = res.choices[0]?.message;
      if (!msg) break;
      const calls = (msg.tool_calls ?? []).filter((c) => c.type === "function");
      if (!calls.length) {
        content = msg.content?.trim() ?? "";
        break;
      }
      messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: calls });
      for (const call of calls) {
        let output: string;
        const args = (() => {
          try {
            return JSON.parse(call.function.arguments || "{}");
          } catch {
            return null;
          }
        })();
        if (call.function.name === SEARCH_TOOL) {
          const [vec] = await embed([String(args?.query ?? "")]);
          const { data } = await supabase.rpc("match_material_chunks", { query_embedding: JSON.stringify(vec), match_count: 6, filter_subject: args?.subject_id || undefined });
          output = JSON.stringify((data ?? []).filter((d) => d.similarity > 0.2).map((d, i) => ({ n: i + 1, material: d.material_title, fragment: d.content.slice(0, 1500) })));
          if (output === "[]") output = "Brak pasujących fragmentów w materiałach.";
        } else if (call.function.name in ACTIONS) {
          const name = call.function.name as ActionName;
          const v = ACTIONS[name].schema.safeParse(args);
          if (v.success) {
            pending.push({ id: call.id, name, label: ACTIONS[name].label, args: v.data as Record<string, unknown>, status: "pending" });
            output = "Akcja zaproponowana - czeka na potwierdzenie użytkownika.";
          } else output = `Niepoprawne argumenty: ${v.error.issues[0]?.message}`;
        } else output = "Nieznane narzędzie.";
        messages.push({ role: "tool", tool_call_id: call.id, content: output });
      }
    }
    if (!content && pending.length) content = "Proponuję następujące zmiany. Potwierdź te, które mam wykonać.";
    const { data: saved, error } = await supabase
      .from("ai_messages")
      .insert({ conversation_id: conversationId, role: "assistant", content, pending_actions: pending.length ? (pending as unknown as Json) : null })
      .select("id,role,content,pending_actions,created_at")
      .single();
    if (error) throw error;
    await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    return NextResponse.json({ conversation_id: conversationId, message: saved });
  } catch (e) {
    return NextResponse.json({ conversation_id: conversationId, error: aiErrorMessage(e) }, { status: 502 });
  }
}
