"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, FileText, GraduationCap, Layers, ListChecks, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiUnavailable } from "@/components/shared/ai-unavailable";

const MODES = [
  { mode: "lecture_notes", label: "Notatki", desc: "Sekcje, definicje, wzory, pytania", icon: FileText },
  { mode: "summary", label: "Podsumuj", desc: "Streszczenie rozdziałów", icon: BookOpenCheck },
  { mode: "flashcards", label: "Fiszki", desc: "20 fiszek do powtórek", icon: Layers },
  { mode: "quiz", label: "Quiz", desc: "10 pytań testowych", icon: ListChecks },
  { mode: "exam_prep", label: "Do egzaminu", desc: "Zakres, plan, ściąga", icon: GraduationCap },
  { mode: "explanation", label: "Wyjaśnij", desc: "Trudny temat prosto", icon: Lightbulb },
] as const;

export function GeneratePanel({ materialId, aiEnabled }: { materialId: string; aiEnabled: boolean }) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  if (!aiEnabled) return <AiUnavailable />;
  const go = async (mode: string) => {
    if (mode === "explanation" && !topic.trim()) {
      toast.error("Wpisz temat, który mam wyjaśnić.");
      return;
    }
    setLoading(mode);
    try {
      const res = await fetch(`/api/materials/${materialId}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, topic: topic.trim() || undefined }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.noteId) router.push(`/materialy/notatki/${json.noteId}`);
      else if (json.quizId) router.push(`/materialy/quiz/${json.quizId}`);
      else {
        toast.success(`Utworzono ${json.count} fiszek`);
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd AI");
    } finally {
      setLoading(null);
    }
  };
  return (
    <div className="grid gap-3">
      <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Opcjonalnie: na czym się skupić / jaki temat wyjaśnić" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <Button key={m.mode} variant="outline" className="h-auto flex-col items-start gap-0.5 p-3 text-left" disabled={!!loading} onClick={() => go(m.mode)}>
            <span className="flex items-center gap-2 font-medium"><m.icon className="size-4 text-primary" /> {loading === m.mode ? "Generuję..." : m.label}</span>
            <span className="text-xs font-normal whitespace-normal text-muted-foreground">{m.desc}</span>
          </Button>
        ))}
      </div>
      {loading && <p className="text-xs text-muted-foreground">To może potrwać do minuty przy dłuższych materiałach.</p>}
    </div>
  );
}
