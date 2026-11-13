import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { features } from "@/lib/env";
import { addDays, formatDate, formatWeekday, startOfWeek, todayKey, weekdayOf } from "@/lib/dates";
import { priorityRank } from "@/lib/labels";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { TaskDialog } from "@/components/planner/task-dialog";
import { TaskItem } from "@/components/planner/task-item";
import { Timeline, blockClass } from "@/components/planner/timeline";
import { AiDayPlanner } from "@/components/planner/ai-day-planner";
import { PostponeAll } from "@/components/planner/postpone-all";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Planer dnia" };

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function PlannerPage({ searchParams }: PageProps<"/planer">) {
  const sp = await searchParams;
  const { supabase, tz } = await getProfile();
  const today = todayKey(tz);
  const date = isDate(sp.data) ? sp.data : today;
  const view = sp.widok === "tydzien" ? "week" : "day";
  const [subjects, goals] = await Promise.all([
    supabase.from("subjects").select("id,name").eq("archived", false).order("name"),
    supabase.from("goals").select("id,title").eq("status", "active").order("title"),
  ]);
  const options = { subjects: subjects.data ?? [], goals: goals.data ?? [] };
  const link = (d: string, w = view) => `/planer?data=${d}${w === "week" ? "&widok=tydzien" : ""}`;

  const tabs = (
    <div className="flex items-center gap-1 rounded-lg border p-0.5">
      <Link href={link(date, "day")} className={cn("rounded-md px-3 py-1 text-sm", view === "day" ? "bg-muted font-medium" : "text-muted-foreground")}>Dzień</Link>
      <Link href={link(date, "week")} className={cn("rounded-md px-3 py-1 text-sm", view === "week" ? "bg-muted font-medium" : "text-muted-foreground")}>Tydzień</Link>
    </div>
  );

  if (view === "week") {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const [tasks, blocks, classes] = await Promise.all([
      supabase.from("tasks").select("*").gte("scheduled_date", start).lte("scheduled_date", end).neq("status", "cancelled"),
      supabase.from("time_blocks").select("*").gte("block_date", start).lte("block_date", end).order("start_time"),
      supabase.from("class_sessions").select("weekday,start_time,end_time,kind,subjects(name,color)").order("start_time"),
    ]);
    return (
      <div>
        <PageHeader
          title="Planer tygodnia"
          description={`${formatDate(start, tz, { day: "numeric", month: "long" })} - ${formatDate(end, tz, { day: "numeric", month: "long", year: "numeric" })}`}
          actions={
            <>
              {tabs}
              <Link aria-label="Poprzedni tydzień" href={link(addDays(start, -7))} className={buttonVariants({ variant: "outline", size: "icon" })}><ChevronLeft /></Link>
              <Link href={link(today)} className={buttonVariants({ variant: "outline" })}>Dziś</Link>
              <Link aria-label="Następny tydzień" href={link(addDays(start, 7))} className={buttonVariants({ variant: "outline", size: "icon" })}><ChevronRight /></Link>
            </>
          }
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {days.map((d) => {
            const dayTasks = (tasks.data ?? []).filter((t) => t.scheduled_date === d).sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
            const dayBlocks = (blocks.data ?? []).filter((b) => b.block_date === d);
            const dayClasses = (classes.data ?? []).filter((c) => c.weekday === weekdayOf(d));
            return (
              <div key={d} className={cn("flex min-h-40 flex-col gap-2 rounded-xl border p-3", d === today && "border-primary/50 bg-primary/5")}>
                <Link href={link(d, "day")} className="flex items-baseline justify-between hover:text-primary">
                  <span className="text-sm font-medium capitalize">{formatWeekday(d)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(d, tz, { day: "numeric", month: "short" })}</span>
                </Link>
                {dayClasses.map((c, i) => {
                  const s = c.subjects as { name: string; color: string } | null;
                  return (
                    <div key={`c${i}`} className="rounded-md border-l-4 border-l-emerald-500 bg-emerald-500/5 px-2 py-1 text-xs">
                      <span className="tabular-nums text-muted-foreground">{c.start_time.slice(0, 5)}</span> {s?.name} <span className="text-muted-foreground">({c.kind})</span>
                    </div>
                  );
                })}
                {dayBlocks.map((b) => (
                  <div key={b.id} className={cn("rounded-md border-l-4 px-2 py-1 text-xs", blockClass(b.kind))}>
                    <span className="tabular-nums text-muted-foreground">{b.start_time.slice(0, 5)}</span> {b.title}
                  </div>
                ))}
                {dayTasks.map((t) => (
                  <div key={t.id} className={cn("text-xs", t.status === "done" && "text-muted-foreground line-through")}>• {t.title}</div>
                ))}
                <TaskDialog options={options} defaultDate={d} trigger={<Button variant="ghost" size="xs" className="mt-auto justify-start text-muted-foreground"><Plus /> Zadanie</Button>} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const [tasks, overdue, blocks] = await Promise.all([
    supabase.from("tasks").select("*").eq("scheduled_date", date).neq("status", "cancelled"),
    date === today
      ? supabase.from("tasks").select("*").lt("scheduled_date", today).in("status", ["todo", "in_progress"]).order("scheduled_date")
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("time_blocks").select("*").eq("block_date", date).order("start_time"),
  ]);
  const unscheduled = await supabase.from("tasks").select("*").is("scheduled_date", null).in("status", ["todo", "in_progress"]).order("created_at", { ascending: false }).limit(20);
  const dayTasks = [...(tasks.data ?? [])].sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || priorityRank[a.priority] - priorityRank[b.priority]);
  const openIds = [...dayTasks.filter((t) => t.status !== "done").map((t) => t.id), ...(overdue.data ?? []).map((t) => t.id)];
  const planned = dayTasks.reduce((s, t) => s + (t.status !== "done" ? (t.estimated_minutes ?? 0) : 0), 0);

  return (
    <div>
      <PageHeader
        title={date === today ? "Dzisiaj" : formatWeekday(date).replace(/^./, (c) => c.toUpperCase())}
        description={formatDate(date, tz, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <>
            {tabs}
            <Link aria-label="Poprzedni dzień" href={link(addDays(date, -1))} className={buttonVariants({ variant: "outline", size: "icon" })}><ChevronLeft /></Link>
            <Link href={link(today)} className={buttonVariants({ variant: "outline" })}>Dziś</Link>
            <Link aria-label="Następny dzień" href={link(addDays(date, 1))} className={buttonVariants({ variant: "outline", size: "icon" })}><ChevronRight /></Link>
            <TaskDialog options={options} defaultDate={date} trigger={<Button><Plus /> Zadanie</Button>} />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Zadania <span className="text-sm font-normal text-muted-foreground">{planned > 0 && `· ok. ${Math.round(planned / 6) / 10} h pracy`}</span>
            </CardTitle>
            <PostponeAll ids={openIds} />
          </CardHeader>
          <CardContent className="grid gap-1">
            {!dayTasks.length && !overdue.data?.length && <p className="text-sm text-muted-foreground">Brak zadań na ten dzień.</p>}
            {dayTasks.map((t) => <TaskItem key={t.id} task={t} options={options} tz={tz} />)}
            {!!overdue.data?.length && (
              <div className="mt-3 border-t pt-3">
                <p className="mb-1 px-2 text-xs font-medium text-amber-700 dark:text-amber-300">Zaległe</p>
                {overdue.data.map((t) => <TaskItem key={t.id} task={t} options={options} tz={tz} showDate />)}
              </div>
            )}
            {!!unscheduled.data?.length && (
              <div className="mt-3 border-t pt-3">
                <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">Bez daty</p>
                {unscheduled.data.map((t) => <TaskItem key={t.id} task={t} options={options} tz={tz} />)}
              </div>
            )}
          </CardContent>
        </Card>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bloki czasu</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline date={date} blocks={blocks.data ?? []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zaplanuj dzień z AI</CardTitle>
            </CardHeader>
            <CardContent>
              <AiDayPlanner date={date} aiEnabled={features.ai} hasBlocks={!!blocks.data?.length} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
