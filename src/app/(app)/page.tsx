import Link from "next/link";
import { CalendarClock, CheckCircle2, GraduationCap, Plus, Sparkles, Target } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { features } from "@/lib/env";
import { addDays, zonedToUtcISO, formatDate, formatWeekday, greeting, relativeDays, toDateKey, toTimeKey, todayKey } from "@/lib/dates";
import { academicKindLabel, goalCategoryLabel, priorityRank } from "@/lib/labels";
import { habitStreak } from "@/lib/habits";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/page-header";
import { Pill } from "@/components/shared/badges";
import { BriefingCard } from "@/components/dashboard/briefing-card";
import { QuickNotes } from "@/components/dashboard/quick-notes";
import { HabitChecklist } from "@/components/dashboard/habit-checklist";
import { TaskItem } from "@/components/planner/task-item";
import { TaskDialog } from "@/components/planner/task-dialog";

export default async function DashboardPage() {
  const { supabase, tz, name } = await getProfile();
  const today = todayKey(tz);
  const horizon = new Date(Date.parse(addDays(today, 21) + "T23:59:59Z")).toISOString();

  const [tasks, overdue, items, subjects, goals, habits, entries, notes, briefing] = await Promise.all([
    supabase.from("tasks").select("*").eq("scheduled_date", today).neq("status", "cancelled"),
    supabase.from("tasks").select("*").lt("scheduled_date", today).in("status", ["todo", "in_progress"]).order("scheduled_date"),
    supabase.from("academic_items").select("*, subjects(name,color)").eq("completed", false).lte("due_at", horizon).gte("due_at", zonedToUtcISO(addDays(today, -1), "00:00", tz)).order("due_at").limit(8),
    supabase.from("subjects").select("id,name,color,progress").eq("archived", false).order("name"),
    supabase.from("goals").select("id,title,category,progress,target_date").eq("status", "active").order("priority").limit(5),
    supabase.from("habits").select("id,title,color,frequency,target_per_week").eq("archived", false),
    supabase.from("habit_entries").select("habit_id,entry_date").eq("done", true).gte("entry_date", addDays(today, -60)),
    supabase.from("quick_notes").select("id,content").order("created_at", { ascending: false }).limit(6),
    supabase.from("daily_briefings").select("content").eq("briefing_date", today).maybeSingle(),
  ]);

  const options = { subjects: subjects.data ?? [], goals: (goals.data ?? []).map((g) => ({ id: g.id, title: g.title })) };
  const todayTasks = [...(tasks.data ?? [])].sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || priorityRank[a.priority] - priorityRank[b.priority]);
  const doneCount = todayTasks.filter((t) => t.status === "done").length;
  const habitRows = (habits.data ?? []).map((h) => {
    const dates = new Set((entries.data ?? []).filter((e) => e.habit_id === h.id).map((e) => e.entry_date));
    return { id: h.id, title: h.title, color: h.color, done: dates.has(today), streak: habitStreak(dates, today, h.frequency, h.target_per_week) };
  });

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatWeekday(today)}, {formatDate(today, tz, { year: "numeric" })}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting(tz)}, {name}
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-stretch">
        <BriefingCard initial={briefing.data?.content ?? null} aiEnabled={features.ai} />
        <Link href="/asystent" className={buttonVariants({ size: "lg", className: "h-auto min-h-12 gap-2 rounded-2xl px-6" })}>
          <Sparkles /> Porozmawiaj z asystentem
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4 text-primary" /> Dzisiejsze zadania
              <span className="text-sm font-normal text-muted-foreground">
                {doneCount}/{todayTasks.length}
              </span>
            </CardTitle>
            <TaskDialog options={options} defaultDate={today} trigger={<Button size="sm" variant="outline"><Plus /> Zadanie</Button>} />
          </CardHeader>
          <CardContent className="grid gap-1">
            {todayTasks.length === 0 && !overdue.data?.length && (
              <EmptyState title="Brak zadań na dziś" description="Dodaj zadanie albo poproś asystenta o zaplanowanie dnia." />
            )}
            {todayTasks.map((t) => (
              <TaskItem key={t.id} task={t} options={options} tz={tz} />
            ))}
            {!!overdue.data?.length && (
              <div className="mt-3 border-t pt-3">
                <p className="mb-1 px-2 text-xs font-medium text-amber-700 dark:text-amber-300">Zaległe ({overdue.data.length})</p>
                {overdue.data.map((t) => (
                  <TaskItem key={t.id} task={t} options={options} tz={tz} showDate />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" /> Nadchodzące terminy
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!items.data?.length && <p className="text-sm text-muted-foreground">Brak terminów w najbliższych 3 tygodniach.</p>}
            {items.data?.map((i) => {
              const key = toDateKey(i.due_at, tz);
              const days = relativeDays(key, today);
              const subject = i.subjects as { name: string; color: string } | null;
              return (
                <Link key={i.id} href="/uczelnia" className="flex items-start gap-3 rounded-lg p-1 hover:bg-muted/50">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: subject?.color ?? "var(--muted-foreground)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {academicKindLabel(i.kind)}
                      {subject ? ` · ${subject.name}` : ""} · {formatDate(key, tz, { day: "numeric", month: "short" })} {toTimeKey(i.due_at, tz)}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${key <= addDays(today, 3) ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>{days}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="size-4 text-primary" /> Postęp w nauce
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!subjects.data?.length && (
              <p className="text-sm text-muted-foreground">
                Dodaj przedmioty w zakładce <Link className="text-primary hover:underline" href="/uczelnia">Uczelnia</Link>.
              </p>
            )}
            {subjects.data?.map((s) => (
              <Link key={s.id} href={`/uczelnia/${s.id}`} className="grid gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{s.progress}%</span>
                </div>
                <Progress value={s.progress} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" /> Cele osobiste
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {!goals.data?.length && (
              <p className="text-sm text-muted-foreground">
                Nie masz jeszcze aktywnych celów. <Link className="text-primary hover:underline" href="/cele">Dodaj pierwszy</Link>.
              </p>
            )}
            {goals.data?.map((g) => (
              <Link key={g.id} href={`/cele/${g.id}`} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{g.title}</span>
                  <Pill>{goalCategoryLabel(g.category)}</Pill>
                </div>
                <Progress value={g.progress} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dzienne cele i nawyki</CardTitle>
          </CardHeader>
          <CardContent>
            {habitRows.length ? (
              <HabitChecklist habits={habitRows} today={today} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Dodaj nawyki, które chcesz odhaczać codziennie, w zakładce <Link className="text-primary hover:underline" href="/nawyki">Nawyki</Link>.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Szybkie notatki</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickNotes notes={notes.data ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
