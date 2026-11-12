import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers, ListChecks, StickyNote } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { features } from "@/lib/env";
import { MATERIAL_KINDS, NOTE_KINDS } from "@/lib/labels";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { GeneratePanel } from "@/components/materials/generate-panel";
import { MaterialActions } from "@/components/materials/material-actions";
import { AskMaterials } from "@/components/materials/ask-materials";
import { AutoRefresh } from "@/components/materials/auto-refresh";

export default async function MaterialPage({ params }: PageProps<"/materialy/[id]">) {
  const { id } = await params;
  const { supabase } = await getProfile();
  const { data: m } = await supabase.from("study_materials").select("*").eq("id", id).maybeSingle();
  if (!m) notFound();
  const [subjects, notes, cards, quizzes] = await Promise.all([
    supabase.from("subjects").select("id,name").eq("archived", false).order("name"),
    supabase.from("ai_notes").select("id,title,kind").eq("material_id", id).order("created_at", { ascending: false }),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("material_id", id),
    supabase.from("quizzes").select("id,title").eq("material_id", id).order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <AutoRefresh active={m.status === "processing"} />
      <Link href="/materialy" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Materiały
      </Link>
      <PageHeader title={m.title} description={`${MATERIAL_KINDS[m.kind]}${m.size_bytes ? ` · ${(m.size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}`} />
      <div className="grid gap-6">
        <MaterialActions id={m.id} title={m.title} subjectId={m.subject_id} subjects={subjects.data ?? []} canReprocess={m.status !== "processing"} />
        {m.status === "processing" && (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              Przetwarzam plik{m.kind === "audio" ? " (transkrypcja nagrania może potrwać kilka minut)" : ""}. Strona odświeży się sama.
            </CardContent>
          </Card>
        )}
        {m.status === "error" && (
          <Card className="border-destructive/40">
            <CardContent className="text-sm text-destructive">Nie udało się przetworzyć pliku: {m.error}</CardContent>
          </Card>
        )}
        {m.status === "ready" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tryby nauki</CardTitle>
              </CardHeader>
              <CardContent>
                <GeneratePanel materialId={m.id} aiEnabled={features.ai} />
              </CardContent>
            </Card>
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><StickyNote className="size-4 text-primary" /> Notatki</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1">
                  {!notes.data?.length && <p className="text-sm text-muted-foreground">Brak.</p>}
                  {notes.data?.map((n) => (
                    <Link key={n.id} href={`/materialy/notatki/${n.id}`} className="flex justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50">
                      <span className="truncate">{n.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{NOTE_KINDS[n.kind]}</span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Layers className="size-4 text-primary" /> Fiszki</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <p className="text-sm text-muted-foreground">{cards.count ?? 0} fiszek z tego materiału.</p>
                  {(cards.count ?? 0) > 0 && (
                    <Link href={`/materialy/fiszki?material=${m.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Ucz się</Link>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="size-4 text-primary" /> Testy</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-1">
                  {!quizzes.data?.length && <p className="text-sm text-muted-foreground">Brak.</p>}
                  {quizzes.data?.map((q) => (
                    <Link key={q.id} href={`/materialy/quiz/${q.id}`} className="truncate rounded px-1 py-1 text-sm hover:bg-muted/50">{q.title}</Link>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Zapytaj ten materiał</CardTitle>
              </CardHeader>
              <CardContent>
                <AskMaterials aiEnabled={features.ai} materialId={m.id} />
              </CardContent>
            </Card>
            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer text-sm font-medium">{m.kind === "audio" ? "Transkrypcja" : "Wyodrębniony tekst"} ({(m.extracted_text?.length ?? 0).toLocaleString("pl-PL")} znaków)</summary>
              <pre className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap font-sans text-sm text-muted-foreground">{m.extracted_text}</pre>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
