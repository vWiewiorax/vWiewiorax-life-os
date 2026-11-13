import Link from "next/link";
import type { Metadata } from "next";
import { FileAudio, FileImage, FileText, Layers, Presentation, StickyNote } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { features } from "@/lib/env";
import { formatDate } from "@/lib/dates";
import { MATERIAL_KINDS, NOTE_KINDS } from "@/lib/labels";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, SectionTitle } from "@/components/shared/page-header";
import { Pill } from "@/components/shared/badges";
import { NativeSelectLinks } from "@/components/materials/subject-filter";
import { UploadForm } from "@/components/materials/upload-form";
import { AutoRefresh } from "@/components/materials/auto-refresh";
import { AskMaterials } from "@/components/materials/ask-materials";
import { NewNoteButton } from "@/components/materials/new-note-button";

export const metadata: Metadata = { title: "Materiały do nauki" };

const ICONS = { pdf: FileText, audio: FileAudio, image: FileImage, presentation: Presentation, text: FileText, other: FileText } as const;
const STATUS: Record<string, { label: string; className: string }> = {
  uploaded: { label: "wysłano", className: "" },
  processing: { label: "przetwarzanie...", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  ready: { label: "gotowe", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  error: { label: "błąd", className: "bg-red-500/10 text-red-700 dark:text-red-300" },
};

export default async function MaterialsPage({ searchParams }: PageProps<"/materialy">) {
  const sp = await searchParams;
  const subjectFilter = typeof sp.przedmiot === "string" ? sp.przedmiot : "";
  const { supabase, user, tz } = await getProfile();
  const nowIso = new Date().toISOString();
  let mq = supabase.from("study_materials").select("id,title,kind,status,error,created_at,subject_id").order("created_at", { ascending: false });
  let nq = supabase.from("ai_notes").select("id,title,kind,updated_at,subject_id").order("updated_at", { ascending: false }).limit(50);
  let qq = supabase.from("quizzes").select("id,title,created_at,questions").order("created_at", { ascending: false }).limit(20);
  if (subjectFilter) {
    mq = mq.eq("subject_id", subjectFilter);
    nq = nq.eq("subject_id", subjectFilter);
    qq = qq.eq("subject_id", subjectFilter);
  }
  const [subjects, materials, notes, quizzes, dueCards, totalCards] = await Promise.all([
    supabase.from("subjects").select("id,name,color").eq("archived", false).order("name"),
    mq,
    nq,
    qq,
    supabase.from("flashcards").select("id", { count: "exact", head: true }).lte("due_at", nowIso),
    supabase.from("flashcards").select("id", { count: "exact", head: true }),
  ]);
  const subjectMap = new Map((subjects.data ?? []).map((s) => [s.id, s]));
  const processing = (materials.data ?? []).some((m) => m.status === "processing");

  return (
    <div>
      <AutoRefresh active={processing} />
      <PageHeader
        title="Materiały do nauki"
        description="Wgraj wykłady, PDF-y, prezentacje i notatki. AI zrobi z nich notatki, fiszki i testy."
        actions={<NativeSelectLinks subjects={subjects.data ?? []} value={subjectFilter} />}
      />
      <div className="grid gap-8">
        <UploadForm userId={user.id} subjects={subjects.data ?? []} defaultSubject={subjectFilter || undefined} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zapytaj swoje materiały</CardTitle>
          </CardHeader>
          <CardContent>
            <AskMaterials aiEnabled={features.ai} subjectId={subjectFilter || undefined} />
          </CardContent>
        </Card>
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <SectionTitle>Pliki</SectionTitle>
            {!materials.data?.length ? (
              <EmptyState icon={FileText} title="Brak materiałów" description="Wgraj pierwszy plik powyżej." />
            ) : (
              <ul className="divide-y rounded-xl border">
                {materials.data.map((m) => {
                  const Icon = ICONS[m.kind];
                  const s = m.subject_id ? subjectMap.get(m.subject_id) : undefined;
                  return (
                    <li key={m.id}>
                      <Link href={`/materialy/${m.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                        <Icon className="size-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {MATERIAL_KINDS[m.kind]} · {formatDate(m.created_at, tz, { day: "numeric", month: "short" })}
                            {m.status === "error" && m.error ? ` · ${m.error}` : ""}
                          </p>
                        </div>
                        {s && <Pill color={s.color}>{s.name}</Pill>}
                        <Pill className={STATUS[m.status].className}>{STATUS[m.status].label}</Pill>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <div className="grid content-start gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Layers className="size-4 text-primary" /> Fiszki</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  {dueCards.count ?? 0} do powtórki dziś, {totalCards.count ?? 0} łącznie.
                </p>
                <Link href="/materialy/fiszki" className={buttonVariants({ variant: (dueCards.count ?? 0) > 0 ? "default" : "outline" })}>
                  Powtórz fiszki
                </Link>
              </CardContent>
            </Card>
            <section>
              <SectionTitle action={<NewNoteButton subjectId={subjectFilter || null} />}>Notatki</SectionTitle>
              {!notes.data?.length ? (
                <p className="text-sm text-muted-foreground">Brak notatek. Wygeneruj je z materiału albo dodaj własną.</p>
              ) : (
                <ul className="grid gap-1">
                  {notes.data.map((n) => (
                    <li key={n.id}>
                      <Link href={`/materialy/notatki/${n.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50">
                        <StickyNote className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{n.title}</span>
                        <span className="text-xs text-muted-foreground">{NOTE_KINDS[n.kind]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <SectionTitle>Testy</SectionTitle>
              {!quizzes.data?.length ? (
                <p className="text-sm text-muted-foreground">Brak testów. Wygeneruj test na stronie materiału.</p>
              ) : (
                <ul className="grid gap-1">
                  {quizzes.data.map((q) => (
                    <li key={q.id}>
                      <Link href={`/materialy/quiz/${q.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50">
                        <span className="truncate">{q.title}</span>
                        <span className="text-xs text-muted-foreground">{Array.isArray(q.questions) ? q.questions.length : 0} pytań</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
