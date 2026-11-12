import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/supabase/server";
import { sendPush } from "@/lib/notify/send";
import { features } from "@/lib/env";

const sub = z.object({ endpoint: z.url(), keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }) });

export async function POST(request: Request) {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const parsed = sub.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Niepoprawna subskrypcja." }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  // Endpoint is globally unique: remove a stale row owned by this user before re-inserting.
  await auth.supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  const { error } = await auth.supabase.from("push_subscriptions").insert({ endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: request.headers.get("user-agent")?.slice(0, 300) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (features.push) {
    try {
      await sendPush({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { title: "Powiadomienia włączone", body: "Tak będą wyglądać przypomnienia z Life OS.", url: "/powiadomienia" });
    } catch {
      /* subscription saved; test push failure is non-fatal */
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await auth.supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
