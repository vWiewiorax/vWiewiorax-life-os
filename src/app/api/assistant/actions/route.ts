import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/supabase/server";
import { ACTIONS, type PendingAction } from "@/lib/ai/assistant-tools";
import type { Json } from "@/lib/supabase/database.types";

const input = z.object({ message_id: z.uuid(), action_id: z.string().min(1), decision: z.enum(["confirm", "reject"]) });

/** Executes (or rejects) an action the assistant proposed, after explicit user confirmation. */
export async function POST(request: Request) {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Niepoprawne dane." }, { status: 400 });
  const { supabase } = auth;
  const { data: msg } = await supabase.from("ai_messages").select("id,pending_actions").eq("id", parsed.data.message_id).maybeSingle();
  const actions = (msg?.pending_actions as PendingAction[] | null) ?? [];
  const action = actions.find((a) => a.id === parsed.data.action_id);
  if (!msg || !action) return NextResponse.json({ error: "Nie znaleziono akcji." }, { status: 404 });
  if (action.status !== "pending") return NextResponse.json({ error: "Ta akcja została już obsłużona." }, { status: 409 });

  if (parsed.data.decision === "reject") action.status = "rejected";
  else {
    const def = ACTIONS[action.name];
    const v = def.schema.safeParse(action.args);
    const res = v.success ? await def.run(v.data as Record<string, unknown>) : { ok: false as const, error: "Niepoprawne argumenty." };
    if (res.ok) action.status = "done";
    else {
      action.status = "error";
      action.error = res.error;
    }
  }
  await supabase.from("ai_messages").update({ pending_actions: actions as unknown as Json }).eq("id", msg.id);
  return NextResponse.json({ action });
}
