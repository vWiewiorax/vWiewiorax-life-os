import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { features } from "@/lib/env";
import { sendEmail, sendPush } from "@/lib/notify/send";
import { DEFAULT_TZ, addDays, todayKey, toTimeKey, zonedToUtcISO } from "@/lib/dates";

export const maxDuration = 60;

/**
 * Background dispatcher. Call every few minutes (Vercel Cron, Supabase pg_cron or any external cron)
 * with header `Authorization: Bearer $CRON_SECRET`.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!features.cron) return NextResponse.json({ error: "Brak SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  const db = createAdminClient();
  const now = new Date();
  const habitsQueued = await queueHabitReminders(db, now);
  const postponedQueued = await queuePostponedReminders(db, now);

  const { data: due, error } = await db
    .from("notifications")
    .select("*")
    .is("sent_at", null)
    .lte("scheduled_for", now.toISOString())
    .lt("attempts", 5)
    .order("scheduled_for")
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((due ?? []).map((n) => n.user_id))];
  const [profiles, subs] = await Promise.all([
    userIds.length ? db.from("profiles").select("id,notification_email,email_notifications,push_notifications").in("id", userIds) : { data: [] },
    userIds.length ? db.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id", userIds) : { data: [] },
  ]);
  const profileMap = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  let sent = 0;
  let failed = 0;

  for (const n of due ?? []) {
    const p = profileMap.get(n.user_id);
    const errors: string[] = [];
    let delivered = n.channels.includes("in_app");
    if (n.channels.includes("push") && p?.push_notifications && features.push) {
      for (const s of (subs.data ?? []).filter((x) => x.user_id === n.user_id)) {
        try {
          const r = await sendPush(s, { title: n.title, body: n.body, url: n.url });
          if (r === "gone") await db.from("push_subscriptions").delete().eq("id", s.id);
          else delivered = true;
        } catch (e) {
          errors.push(`push: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
    if (n.channels.includes("email") && p?.email_notifications && p.notification_email && features.email) {
      try {
        await sendEmail(p.notification_email, n.title, n.body ?? "", n.url);
        delivered = true;
      } catch (e) {
        errors.push(`email: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (delivered || errors.length === 0) {
      await db.from("notifications").update({ sent_at: now.toISOString(), attempts: n.attempts + 1, last_error: errors.join("; ") || null }).eq("id", n.id);
      sent++;
    } else {
      await db.from("notifications").update({ attempts: n.attempts + 1, last_error: errors.join("; ") }).eq("id", n.id);
      failed++;
    }
  }
  return NextResponse.json({ processed: due?.length ?? 0, sent, failed, habitsQueued, postponedQueued });
}

/** Creates today's notification for habits with reminder_time that is due and not yet done or queued. */
async function queueHabitReminders(db: ReturnType<typeof createAdminClient>, now: Date) {
  const { data: habits } = await db.from("habits").select("id,user_id,title,reminder_time").eq("archived", false).not("reminder_time", "is", null);
  if (!habits?.length) return 0;
  const { data: profiles } = await db.from("profiles").select("id,timezone").in("id", [...new Set(habits.map((h) => h.user_id))]);
  const tzOf = new Map((profiles ?? []).map((p) => [p.id, p.timezone || DEFAULT_TZ]));
  let queued = 0;
  for (const h of habits) {
    const tz = tzOf.get(h.user_id) ?? DEFAULT_TZ;
    const today = todayKey(tz);
    const time = h.reminder_time!.slice(0, 5);
    if (toTimeKey(now, tz) < time) continue;
    const dayStart = zonedToUtcISO(today, "00:00", tz);
    const dayEnd = zonedToUtcISO(addDays(today, 1), "00:00", tz);
    const [{ count: done }, { count: existing }] = await Promise.all([
      db.from("habit_entries").select("id", { count: "exact", head: true }).eq("habit_id", h.id).eq("entry_date", today).eq("done", true),
      db.from("notifications").select("id", { count: "exact", head: true }).eq("source_type", "habit").eq("source_id", h.id).gte("scheduled_for", dayStart).lt("scheduled_for", dayEnd),
    ]);
    if (done || existing) continue;
    await db.from("notifications").insert({ user_id: h.user_id, title: `Nawyk: ${h.title}`, body: "Pora na dzisiejszy nawyk. Odhacz go po wykonaniu.", url: "/nawyki", scheduled_for: now.toISOString(), source_type: "habit", source_id: h.id, channels: ["push", "in_app"] });
    queued++;
  }
  return queued;
}

/** Nudges about tasks postponed 3+ times, at most once every 3 days per task. */
async function queuePostponedReminders(db: ReturnType<typeof createAdminClient>, now: Date) {
  const { data: tasks } = await db.from("tasks").select("id,user_id,title,postponed_count").gte("postponed_count", 3).in("status", ["todo", "in_progress"]).limit(500);
  if (!tasks?.length) return 0;
  const since = new Date(now.getTime() - 3 * 86400000).toISOString();
  const { data: recent } = await db.from("notifications").select("source_id").eq("source_type", "postponed").gte("scheduled_for", since).in("source_id", tasks.map((t) => t.id));
  const skip = new Set((recent ?? []).map((r) => r.source_id));
  const rows = tasks
    .filter((t) => !skip.has(t.id))
    .map((t) => ({
      user_id: t.user_id,
      title: `Odkładasz: ${t.title}`,
      body: `To zadanie było przekładane ${t.postponed_count} razy. Może warto podzielić je na mniejszy krok, zmienić termin albo je usunąć?`,
      url: "/planer",
      scheduled_for: now.toISOString(),
      source_type: "postponed",
      source_id: t.id,
      channels: ["push", "in_app"],
    }));
  if (rows.length) await db.from("notifications").insert(rows);
  return rows.length;
}

export const GET = handle;
export const POST = handle;
