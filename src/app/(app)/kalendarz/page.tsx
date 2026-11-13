import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { addDays, addMonths, formatDate, startOfMonth, startOfWeek, toDateKey, toTimeKey, todayKey, weekdayOf, WEEKDAY_SHORT } from "@/lib/dates";
import { academicKindLabel } from "@/lib/labels";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EventDialog } from "@/components/calendar/event-dialog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Kalendarz" };

type Entry = { key: string; time: string; label: string; color: string; href?: string; kind: "academic" | "event" | "task" | "class"; event?: { id: string; title: string; description: string | null; location: string | null; date: string; start: string; end: string; all_day: boolean; subject_id: string | null } };

export default async function CalendarPage({ searchParams }: PageProps<"/kalendarz">) {
  const sp = await searchParams;
  const { supabase, tz } = await getProfile();
  const today = todayKey(tz);
  const month = typeof sp.miesiac === "string" && /^\d{4}-\d{2}$/.test(sp.miesiac) ? `${sp.miesiac}-01` : startOfMonth(today);
  const showClasses = sp.zajecia !== "0";
  const gridStart = startOfWeek(month);
  const nextMonth = addMonths(month, 1);
  const gridEnd = addDays(startOfWeek(addDays(nextMonth, -1)), 6);
  const fromIso = new Date(Date.parse(addDays(gridStart, -1) + "T00:00:00Z")).toISOString();
  const toIso = new Date(Date.parse(addDays(gridEnd, 1) + "T23:59:59Z")).toISOString();

  const [subjects, items, events, tasks, classes] = await Promise.all([
    supabase.from("subjects").select("id,name,color").eq("archived", false).order("name"),
    supabase.from("academic_items").select("id,title,kind,due_at,completed,subject_id").gte("due_at", fromIso).lte("due_at", toIso),
    supabase.from("calendar_events").select("*").gte("starts_at", fromIso).lte("starts_at", toIso),
    supabase.from("tasks").select("id,title,scheduled_date,due_at,status").gte("scheduled_date", gridStart).lte("scheduled_date", gridEnd).neq("status", "cancelled"),
    showClasses ? supabase.from("class_sessions").select("subject_id,weekday,start_time,kind") : Promise.resolve({ data: [] as { subject_id: string; weekday: number; start_time: string; kind: string }[] }),
  ]);
  const color = new Map((subjects.data ?? []).map((s) => [s.id, s]));
  const entries: Entry[] = [];
  for (const i of items.data ?? [])
    entries.push({
      key: toDateKey(i.due_at, tz),
      time: toTimeKey(i.due_at, tz),
      label: `${academicKindLabel(i.kind)}: ${i.title}`,
      color: (i.subject_id && color.get(i.subject_id)?.color) || "#ef4444",
      href: i.subject_id ? `/uczelnia/${i.subject_id}` : "/uczelnia",
      kind: "academic",
    });
  for (const e of events.data ?? []) {
    const key = toDateKey(e.starts_at, tz);
    entries.push({
      key,
      time: e.all_day ? "" : toTimeKey(e.starts_at, tz),
      label: e.title,
      color: (e.subject_id && color.get(e.subject_id)?.color) || "#0ea5e9",
      kind: "event",
      event: { id: e.id, title: e.title, description: e.description, location: e.location, date: key, start: toTimeKey(e.starts_at, tz), end: e.ends_at ? toTimeKey(e.ends_at, tz) : "", all_day: e.all_day, subject_id: e.subject_id },
    });
  }
  for (const t of tasks.data ?? []) if (t.scheduled_date) entries.push({ key: t.scheduled_date, time: "", label: t.title, color: "#94a3b8", href: `/planer?data=${t.scheduled_date}`, kind: "task" });

  const days: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);
  const subjectOpts = (subjects.data ?? []).map((s) => ({ id: s.id, name: s.name }));
  const monthParam = (d: string) => d.slice(0, 7);

  return (
    <div>
      <PageHeader
        title="Kalendarz"
        description={formatDate(month, tz, { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase())}
        actions={
          <>
            <Link href={`/kalendarz?miesiac=${monthParam(month)}&zajecia=${showClasses ? "0" : "1"}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {showClasses ? "Ukryj zajęcia" : "Pokaż zajęcia"}
            </Link>
            <Link aria-label="Poprzedni miesiąc" href={`/kalendarz?miesiac=${monthParam(addMonths(month, -1))}`} className={buttonVariants({ variant: "outline", size: "icon" })}><ChevronLeft /></Link>
            <Link href="/kalendarz" className={buttonVariants({ variant: "outline" })}>Dziś</Link>
            <Link aria-label="Następny miesiąc" href={`/kalendarz?miesiac=${monthParam(nextMonth)}`} className={buttonVariants({ variant: "outline", size: "icon" })}><ChevronRight /></Link>
            <EventDialog subjects={subjectOpts} initial={{ date: today }} trigger={<Button><Plus /> Wydarzenie</Button>} />
          </>
        }
      />
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-500" /> Egzaminy i terminy (kolor przedmiotu)</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-500" /> Wydarzenia</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-400" /> Zadania</span>
        {showClasses && <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm border border-emerald-500" /> Zajęcia</span>}
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-7 overflow-hidden rounded-xl border">
          {WEEKDAY_SHORT.map((d) => (
            <div key={d} className="border-b bg-muted/40 px-2 py-1.5 text-xs font-medium uppercase text-muted-foreground">{d}</div>
          ))}
          {days.map((d) => {
            const inMonth = d >= month && d < nextMonth;
            const dayEntries = entries.filter((e) => e.key === d).sort((a, b) => a.time.localeCompare(b.time));
            const dayClasses = (classes.data ?? []).filter((c) => c.weekday === weekdayOf(d));
            return (
              <div key={d} className={cn("min-h-28 min-w-0 overflow-hidden border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-muted/20 text-muted-foreground")}>
                <Link href={`/planer?data=${d}`} className={cn("mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs hover:bg-muted", d === today && "bg-primary font-semibold text-primary-foreground hover:bg-primary")}>
                  {Number(d.slice(8))}
                </Link>
                <div className="grid gap-0.5">
                  {dayClasses.map((c, i) => (
                    <div key={`c${i}`} className="truncate rounded border px-1 text-[11px]" style={{ borderColor: color.get(c.subject_id)?.color }}>
                      {c.start_time.slice(0, 5)} {color.get(c.subject_id)?.name}
                    </div>
                  ))}
                  {dayEntries.map((e, i) => {
                    const body = (
                      <span className={cn("flex items-center gap-1 truncate rounded px-1 text-[11px] hover:bg-muted", e.kind === "academic" && "font-medium")}>
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: e.color }} />
                        {e.time && <span className="tabular-nums text-muted-foreground">{e.time}</span>}
                        <span className="truncate">{e.label}</span>
                      </span>
                    );
                    if (e.event)
                      return (
                        <EventDialog
                          key={i}
                          id={e.event.id}
                          subjects={subjectOpts}
                          initial={{ title: e.event.title, description: e.event.description ?? "", location: e.event.location ?? "", date: e.event.date, start_time: e.event.start, end_time: e.event.end, all_day: e.event.all_day, subject_id: e.event.subject_id ?? "" }}
                          trigger={<button className="w-full text-left">{body}</button>}
                        />
                      );
                    return <Link key={i} href={e.href ?? "#"}>{body}</Link>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
