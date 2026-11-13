import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Mail, MapPin, Pencil, Plus, Trash2, User } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { todayKey } from "@/lib/dates";
import { MATERIAL_KINDS } from "@/lib/labels";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionTitle } from "@/components/shared/page-header";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { SubjectDialog } from "@/components/university/subject-dialog";
import { AcademicItemDialog } from "@/components/university/academic-item-dialog";
import { AcademicList } from "@/components/university/academic-list";
import { ClassSessions } from "@/components/university/class-session-form";
import { SubjectProgress } from "@/components/university/subject-progress";
import { deleteSubject } from "@/server/actions/university";

export default async function SubjectPage({ params }: PageProps<"/uczelnia/[id]">) {
  const { id } = await params;
  const { supabase, tz } = await getProfile();
  const { data: s } = await supabase.from("subjects").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const [items, sessions, materials, subjects] = await Promise.all([
    supabase.from("academic_items").select("*").eq("subject_id", id).order("due_at"),
    supabase.from("class_sessions").select("*").eq("subject_id", id).order("weekday").order("start_time"),
    supabase.from("study_materials").select("id,title,kind,status,created_at").eq("subject_id", id).order("created_at", { ascending: false }),
    supabase.from("subjects").select("id,name,color").eq("archived", false).order("name"),
  ]);

  const deleteAction = async () => {
    "use server";
    return deleteSubject(id);
  };

  return (
    <div>
      <Link href="/uczelnia" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Uczelnia
      </Link>
      <PageHeader
        title={s.name}
        description={[s.code, s.semester, s.ects ? `${s.ects} ECTS` : null].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <SubjectDialog
              id={s.id}
              initial={{
                name: s.name,
                code: s.code ?? "",
                color: s.color,
                professor: s.professor ?? "",
                professor_email: s.professor_email ?? "",
                professor_office_hours: s.professor_office_hours ?? "",
                room: s.room ?? "",
                ects: s.ects != null ? String(s.ects) : "",
                semester: s.semester ?? "",
                description: s.description ?? "",
              }}
              trigger={<Button variant="outline"><Pencil /> Edytuj</Button>}
            />
            <ConfirmButton
              title="Usunąć przedmiot?"
              description="Plan zajęć zostanie usunięty. Terminy, zadania i materiały zostaną zachowane, ale bez przypisania do przedmiotu."
              action={deleteAction}
              variant="outline"
              size="default"
              redirectTo="/uczelnia"
            >
              <Trash2 /> Usuń
            </ConfirmButton>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacje</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {s.professor && (
              <p className="flex items-center gap-2"><User className="size-4 text-muted-foreground" /> {s.professor}</p>
            )}
            {s.professor_email && (
              <a className="flex items-center gap-2 text-primary hover:underline" href={`mailto:${s.professor_email}`}><Mail className="size-4" /> {s.professor_email}</a>
            )}
            {s.professor_office_hours && <p className="text-muted-foreground">Konsultacje: {s.professor_office_hours}</p>}
            {s.room && (
              <p className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" /> {s.room}</p>
            )}
            {s.description && <p className="whitespace-pre-wrap text-muted-foreground">{s.description}</p>}
            <div className="grid gap-1.5 pt-2">
              <span className="text-xs text-muted-foreground">Twój postęp</span>
              <SubjectProgress id={s.id} value={s.progress} />
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Plan zajęć</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassSessions subjectId={s.id} sessions={sessions.data ?? []} />
          </CardContent>
        </Card>
      </div>
      <section className="mt-8">
        <SectionTitle action={<AcademicItemDialog subjects={subjects.data ?? []} initial={{ subject_id: s.id }} trigger={<Button size="sm" variant="outline"><Plus /> Termin</Button>} />}>
          Terminy
        </SectionTitle>
        <AcademicList items={items.data ?? []} subjects={subjects.data ?? []} tz={tz} today={todayKey(tz)} hideSubjectFilter />
      </section>
      <section className="mt-8">
        <SectionTitle action={<Link href={`/materialy?przedmiot=${s.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}><Plus /> Dodaj materiał</Link>}>
          Materiały
        </SectionTitle>
        {materials.data?.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {materials.data.map((m) => (
              <li key={m.id}>
                <Link href={`/materialy/${m.id}`} className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{m.title}</span>
                  <span className="text-xs text-muted-foreground">{MATERIAL_KINDS[m.kind]}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Brak materiałów do tego przedmiotu.</p>
        )}
      </section>
    </div>
  );
}
