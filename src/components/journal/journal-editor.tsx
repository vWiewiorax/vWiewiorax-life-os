"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/fields";
import { Markdown } from "@/components/shared/markdown";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { AiUnavailable } from "@/components/shared/ai-unavailable";
import { REFLECTION_QUESTIONS, MOODS } from "@/lib/journal";
import { deleteJournalEntry, saveJournalEntry } from "@/server/actions/journal";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

type Entry = { id?: string; entry_date: string; title: string | null; mood: number | null; content: string; answers: Record<string, string>; gratitude: string | null; tags: string[]; ai_reflection: string | null };

export function JournalEditor({ entry, aiEnabled }: { entry: Entry; aiEnabled: boolean }) {
  const router = useRouter();
  const [v, setV] = useState({ ...entry, title: entry.title ?? "", gratitude: entry.gratitude ?? "", tagText: entry.tags.join(", ") });
  const [useTemplate, setUseTemplate] = useState(Object.keys(entry.answers).length > 0 || !entry.id);
  const [reflection, setReflection] = useState(entry.ai_reflection);
  const [thinking, setThinking] = useState(false);
  const { pending, run } = useAction();

  const save = () =>
    run(
      () =>
        saveJournalEntry(
          {
            entry_date: v.entry_date,
            title: v.title,
            mood: v.mood,
            content: v.content,
            answers: Object.fromEntries(Object.entries(v.answers).filter(([, a]) => a.trim())),
            gratitude: v.gratitude,
            tags: v.tagText.split(",").map((t) => t.trim()).filter(Boolean),
          },
          entry.id,
        ),
      { success: "Zapisano wpis", onSuccess: (d) => !entry.id && d && router.replace(`/dziennik/${d.id}`) },
    );

  const reflect = async () => {
    if (!entry.id) return toast.error("Najpierw zapisz wpis.");
    setThinking(true);
    try {
      const res = await fetch("/api/ai/reflection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "entry", entry_id: entry.id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setReflection(json.content);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd AI");
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="grid content-start gap-4">
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <Field label="Data"><Input type="date" value={v.entry_date} onChange={(e) => setV({ ...v, entry_date: e.target.value })} /></Field>
          <Field label="Tytuł (opcjonalnie)"><Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></Field>
        </div>
        <Field label="Samopoczucie">
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m, i) => (
              <button key={m} type="button" onClick={() => setV({ ...v, mood: v.mood === i + 1 ? null : i + 1 })} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", v.mood === i + 1 ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                {i + 1} · {m}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Wpis"><Textarea className="min-h-48" value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })} placeholder="Co się dziś wydarzyło? Co czujesz? Co myślisz?" /></Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary" checked={useTemplate} onChange={(e) => setUseTemplate(e.target.checked)} /> Pytania do refleksji
        </label>
        {useTemplate &&
          REFLECTION_QUESTIONS.map((q) => (
            <Field key={q} label={q}>
              <Textarea rows={2} value={v.answers[q] ?? ""} onChange={(e) => setV({ ...v, answers: { ...v.answers, [q]: e.target.value } })} />
            </Field>
          ))}
        <Field label="Za co jestem wdzięczny"><Textarea rows={2} value={v.gratitude} onChange={(e) => setV({ ...v, gratitude: e.target.value })} /></Field>
        <Field label="Tagi" hint="oddzielone przecinkami, np. studia, zdrowie, relacje"><Input value={v.tagText} onChange={(e) => setV({ ...v, tagText: e.target.value })} /></Field>
        <div className="flex gap-2">
          <Button onClick={save} disabled={pending}><Save /> {pending ? "Zapisywanie..." : "Zapisz"}</Button>
          {entry.id && (
            <ConfirmButton title="Usunąć wpis?" description="Tej operacji nie można cofnąć." action={() => deleteJournalEntry(entry.id!)} variant="outline" size="default" redirectTo="/dziennik">
              <Trash2 /> Usuń
            </ConfirmButton>
          )}
        </div>
      </div>
      <aside className="grid content-start gap-3 rounded-2xl border p-4">
        <p className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-primary" /> Refleksja z AI</p>
        <p className="text-xs text-muted-foreground">Wpis trafi do AI tylko po kliknięciu przycisku. AI nie jest psychologiem ani terapeutą - pomaga uporządkować myśli.</p>
        {aiEnabled ? (
          <Button variant="outline" size="sm" onClick={reflect} disabled={thinking || !entry.id}>{thinking ? "Myślę..." : reflection ? "Nowa refleksja" : "Pomóż mi to przemyśleć"}</Button>
        ) : (
          <AiUnavailable />
        )}
        {!entry.id && <p className="text-xs text-muted-foreground">Zapisz wpis, aby poprosić o refleksję.</p>}
        {reflection && <Markdown className="text-sm">{reflection}</Markdown>}
      </aside>
    </div>
  );
}
