import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getProfile } from "@/lib/profile";
import { todayKey, WEEKDAY_SHORT } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState, PageHeader, SectionTitle } from "@/components/shared/page-header";
import { SubjectDialog } from "@/components/university/subject-dialog";
import { AcademicItemDialog } from "@/components/university/academic-item-dialog";
import { AcademicList } from "@/components/university/academic-list";
import { StudyAdvisor } from "@/components/university/study-advisor";
import { features } from "@/lib/env";

export const metadata: Metadata = { title: "Uczelnia" };

export default async function UniversityPage() {
  const { supabase, tz, profile } = await getProfile();
  const [subjects, items, sessions] = await Promise.all([
    supabase.from("subjects").select("*").eq("archived", false).order("name"),
    supabase.from("academic_items").select("*").order("due_at"),
    supabase.from("class_sessions").select("subject_id,weekday,start_time,end_time,kind"),
  ]);
  const subjectList = subjects.data ?? [];
  const pendingCount = new Map<string, number>();
  for (const i of items.data ?? []) if (!i.completed && i.subject_id) pendingCount.set(i.subject_id, (pendingCount.get(i.subject_id) ?? 0) + 1);

  return (
    <div>
      <PageHeader
        title="Uczelnia"
        description="Przedmioty, prowadzący, plan zajęć i wszystkie terminy w jednym miejscu."
        actions={
          <>
            <SubjectDialog trigger={<Button variant="outline"><Plus /> Przedmiot</Button>} />
            <AcademicItemDialog subjects={subjectList} defaultReminders={profile?.default_reminder_offsets ?? [1440, 4320]} trigger={<Button><Plus /> Termin</Button>} />
          </>
        }
      />
      <div className="grid gap-8">
        <StudyAdvisor aiEnabled={features.ai} />
        <section>
          <SectionTitle>Przedmioty</SectionTitle>
          {subjectList.length === 0 ? (
            <EmptyState icon={BookOpen} title="Nie masz jeszcze przedmiotów" description="Dodaj przedmioty z tego semestru, żeby śledzić terminy, materiały i postępy." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {subjectList.map((s) => {
                const sess = (sessions.data ?? []).filter((x) => x.subject_id === s.id);
                return (
                  <Link key={s.id} href={`/uczelnia/${s.id}`}>
                    <Card className="h-full transition-colors hover:border-primary/40">
                      <CardContent className="grid gap-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: s.color }} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{s.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{[s.professor, s.code, s.ects ? `${s.ects} ECTS` : null].filter(Boolean).join(" · ") || "Brak szczegółów"}</p>
                          </div>
                        </div>
                        {sess.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {sess.map((x) => `${WEEKDAY_SHORT[x.weekday - 1]} ${x.start_time.slice(0, 5)}`).join(", ")}
                          </p>
                        )}
                        <div className="grid gap-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{pendingCount.get(s.id) ?? 0} otwartych terminów</span>
                            <span>{s.progress}%</span>
                          </div>
                          <Progress value={s.progress} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <section>
          <SectionTitle>Egzaminy, kolokwia, zadania i projekty</SectionTitle>
          <AcademicList items={items.data ?? []} subjects={subjectList} tz={tz} today={todayKey(tz)} />
        </section>
      </div>
    </div>
  );
}
