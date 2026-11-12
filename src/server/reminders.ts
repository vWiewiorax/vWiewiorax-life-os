import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import { localInputToISO } from "@/lib/dates";

type Source = { type: "academic_item" | "task" | "goal" | "time_block" | "habit" | "custom"; id: string };

/**
 * Replaces the not-yet-sent reminders of a source with new ones.
 * `offsets` are minutes before `targetIso`; `custom` is a datetime-local string in `tz`.
 */
export async function scheduleReminders(
  supabase: ServerSupabase,
  userId: string,
  source: Source,
  opts: { title: string; body?: string; url?: string; targetIso: string | null; offsets: number[]; custom?: string | null; tz: string },
) {
  await supabase.from("notifications").delete().eq("source_type", source.type).eq("source_id", source.id).is("sent_at", null);
  if (!opts.targetIso && !opts.custom) return;

  const now = Date.now();
  const times = new Set<string>();
  if (opts.targetIso) {
    const target = Date.parse(opts.targetIso);
    for (const off of opts.offsets) {
      const at = target - off * 60_000;
      if (at > now) times.add(new Date(at).toISOString());
    }
  }
  if (opts.custom) {
    const iso = localInputToISO(opts.custom, opts.tz);
    if (Date.parse(iso) > now) times.add(iso);
  }
  if (!times.size) return;

  await supabase.from("notifications").insert(
    [...times].map((scheduled_for) => ({
      user_id: userId,
      title: opts.title,
      body: opts.body ?? null,
      url: opts.url ?? null,
      scheduled_for,
      source_type: source.type,
      source_id: source.id,
    })),
  );
}

export async function clearReminders(supabase: ServerSupabase, type: Source["type"], id: string) {
  await supabase.from("notifications").delete().eq("source_type", type).eq("source_id", id).is("sent_at", null);
}

export function offsetLabel(minutes: number) {
  if (minutes < 60) return `za ${minutes} min`;
  if (minutes < 1440) return `za ${Math.round(minutes / 60)} h`;
  const d = Math.round(minutes / 1440);
  return d === 1 ? "jutro" : `za ${d} dni`;
}
