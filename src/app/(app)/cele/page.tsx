import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Target } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { formatDate } from "@/lib/dates";
import { GOAL_CATEGORIES, goalStatusLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState, PageHeader, SectionTitle } from "@/components/shared/page-header";
import { PriorityBadge, Pill } from "@/components/shared/badges";
import { GoalDialog } from "@/components/goals/goal-dialog";

export const metadata: Metadata = { title: "Cele" };

export default async function GoalsPage() {
  const { supabase, tz } = await getProfile();
  const [{ data: goals }, milestones] = await Promise.all([
    supabase.from("goals").select("*").order("status").order("target_date", { nullsFirst: false }),
    supabase.from("milestones").select("goal_id,done"),
  ]);
  const stats = new Map<string, { done: number; total: number }>();
  for (const m of milestones.data ?? []) {
    const s = stats.get(m.goal_id) ?? { done: 0, total: 0 };
    s.total++;
    if (m.done) s.done++;
    stats.set(m.goal_id, s);
  }
  return (
    <div>
      <PageHeader title="Cele" description="Co chcesz osiągnąć i dlaczego. AI pomoże rozbić cele na kroki i regularnie je przeglądać." actions={<GoalDialog trigger={<Button><Plus /> Cel</Button>} />} />
      {!goals?.length ? (
        <EmptyState icon={Target} title="Nie masz jeszcze celów" description="Zacznij od jednego celu, który jest dla Ciebie naprawdę ważny." />
      ) : (
        <div className="grid gap-8">
          {GOAL_CATEGORIES.map((c) => {
            const list = goals.filter((g) => g.category === c.value);
            if (!list.length) return null;
            return (
              <section key={c.value}>
                <SectionTitle>{c.label}</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((g) => {
                    const s = stats.get(g.id);
                    return (
                      <Link key={g.id} href={`/cele/${g.id}`}>
                        <Card className={`h-full transition-colors hover:border-primary/40 ${g.status !== "active" ? "opacity-70" : ""}`}>
                          <CardContent className="grid gap-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium">{g.title}</p>
                              <PriorityBadge priority={g.priority} />
                            </div>
                            <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                              {g.status !== "active" && <Pill>{goalStatusLabel(g.status)}</Pill>}
                              {g.target_date && <Pill>do {formatDate(g.target_date, tz, { day: "numeric", month: "short", year: "numeric" })}</Pill>}
                              {s && <Pill>{s.done}/{s.total} kroków</Pill>}
                            </div>
                            <Progress value={g.progress} />
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
