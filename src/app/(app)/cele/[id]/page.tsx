import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { features } from "@/lib/env";
import { formatDate } from "@/lib/dates";
import { goalCategoryLabel, goalStatusLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { Pill, PriorityBadge } from "@/components/shared/badges";
import { GoalDialog } from "@/components/goals/goal-dialog";
import { GoalProgress, Milestones } from "@/components/goals/milestones";
import { Reflections } from "@/components/goals/reflections";
import { GoalAssistant } from "@/components/goals/goal-assistant";
import { deleteGoal } from "@/server/actions/goals";

export default async function GoalPage({ params }: PageProps<"/cele/[id]">) {
  const { id } = await params;
  const { supabase, tz } = await getProfile();
  const { data: g } = await supabase.from("goals").select("*").eq("id", id).maybeSingle();
  if (!g) notFound();
  const [milestones, reflections, habits, tasks] = await Promise.all([
    supabase.from("milestones").select("id,title,due_date,done").eq("goal_id", id).order("position"),
    supabase.from("goal_reflections").select("id,content,created_at").eq("goal_id", id).order("created_at", { ascending: false }),
    supabase.from("habits").select("id,title,color").eq("goal_id", id).eq("archived", false),
    supabase.from("tasks").select("id,title,status,scheduled_date").eq("goal_id", id).in("status", ["todo", "in_progress"]).limit(10),
  ]);
  const remove = async () => {
    "use server";
    return deleteGoal(id);
  };
  return (
    <div>
      <Link href="/cele" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Cele
      </Link>
      <PageHeader
        title={g.title}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <Pill>{goalCategoryLabel(g.category)}</Pill>
            <Pill>{goalStatusLabel(g.status)}</Pill>
            <PriorityBadge priority={g.priority} />
            {g.target_date && <Pill>termin: {formatDate(g.target_date, tz, { day: "numeric", month: "long", year: "numeric" })}</Pill>}
          </span>
        }
        actions={
          <>
            <GoalDialog id={g.id} initial={{ category: g.category, title: g.title, description: g.description ?? "", why: g.why ?? "", target_date: g.target_date ?? "", priority: g.priority, status: g.status }} trigger={<Button variant="outline"><Pencil /> Edytuj</Button>} />
            <ConfirmButton title="Usunąć cel?" description="Kroki i refleksje zostaną usunięte. Zadania i nawyki zostaną, ale bez powiązania." action={remove} variant="outline" size="default" redirectTo="/cele">
              <Trash2 /> Usuń
            </ConfirmButton>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-6">
          <Card>
            <CardContent className="grid gap-4 text-sm">
              {g.description && <p className="whitespace-pre-wrap">{g.description}</p>}
              {g.why && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Dlaczego to ważne</p>
                  <p className="whitespace-pre-wrap">{g.why}</p>
                </div>
              )}
              <div className="grid gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">Postęp</p>
                <GoalProgress key={g.progress} id={g.id} value={g.progress} auto={!!milestones.data?.length} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Kroki</CardTitle></CardHeader>
            <CardContent><Milestones goalId={g.id} items={milestones.data ?? []} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Powiązane nawyki i zadania</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {!habits.data?.length && !tasks.data?.length && (
                <p className="text-muted-foreground">Brak. Przypisz cel przy tworzeniu nawyku (<Link className="text-primary hover:underline" href="/nawyki">Nawyki</Link>) lub zadania (<Link className="text-primary hover:underline" href="/planer">Planer</Link>).</p>
              )}
              {habits.data?.map((h) => (
                <Link key={h.id} href="/nawyki" className="flex items-center gap-2 hover:text-primary"><span className="size-2 rounded-full" style={{ background: h.color }} /> {h.title}</Link>
              ))}
              {tasks.data?.map((t) => (
                <Link key={t.id} href={`/planer${t.scheduled_date ? `?data=${t.scheduled_date}` : ""}`} className="text-muted-foreground hover:text-primary">• {t.title}</Link>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Asystent celu</CardTitle></CardHeader>
            <CardContent><GoalAssistant goalId={g.id} aiEnabled={features.ai} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Notatki i refleksje</CardTitle></CardHeader>
            <CardContent><Reflections goalId={g.id} items={reflections.data ?? []} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
