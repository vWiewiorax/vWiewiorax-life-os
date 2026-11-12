"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/shared/markdown";
import { AiUnavailable } from "@/components/shared/ai-unavailable";
import { addMilestones } from "@/server/actions/goals";
import { useAction } from "@/hooks/use-action";

type Breakdown = { intro: string; milestones: { title: string; due_date?: string | null }[]; questions: string[] };

export function GoalAssistant({ goalId, aiEnabled }: { goalId: string; aiEnabled: boolean }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [plan, setPlan] = useState<Breakdown | null>(null);
  const [selected, setSelected] = useState<boolean[]>([]);
  const { pending, run } = useAction();
  if (!aiEnabled) return <AiUnavailable />;
  const call = async (mode: string) => {
    setLoading(mode);
    try {
      const res = await fetch("/api/ai/goal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal_id: goalId, mode, message: message.trim() || undefined }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (mode === "breakdown") {
        setPlan(json);
        setSelected(json.milestones.map(() => true));
        setContent(null);
      } else {
        setContent(json.content);
        setPlan(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd AI");
    } finally {
      setLoading(null);
    }
  };
  return (
    <div className="grid gap-3">
      <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Opcjonalnie: co teraz myślisz o tym celu, co Cię blokuje, ile masz czasu w tygodniu..." />
      <div className="flex flex-wrap gap-2">
        {[
          ["define", "Doprecyzuj cel"],
          ["breakdown", "Rozbij na kroki"],
          ["obstacles", "Przeszkody i plan B"],
          ["review", "Przegląd postępu"],
        ].map(([mode, label]) => (
          <Button key={mode} variant="outline" size="sm" disabled={!!loading} onClick={() => call(mode)}>
            <Sparkles /> {loading === mode ? "Myślę..." : label}
          </Button>
        ))}
      </div>
      {content && <div className="rounded-xl border p-4"><Markdown>{content}</Markdown></div>}
      {plan && (
        <div className="grid gap-3 rounded-xl border p-4">
          <p className="text-sm">{plan.intro}</p>
          <div className="grid gap-1.5">
            {plan.milestones.map((m, i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selected[i]} onCheckedChange={(c) => setSelected((s) => s.map((x, j) => (j === i ? Boolean(c) : x)))} />
                <span className="flex-1">{m.title}</span>
                {m.due_date && <span className="text-xs text-muted-foreground">{m.due_date}</span>}
              </label>
            ))}
          </div>
          {plan.questions.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {plan.questions.map((q) => <li key={q}>{q}</li>)}
            </ul>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || !selected.some(Boolean)}
              onClick={() => run(() => addMilestones(goalId, plan.milestones.filter((_, i) => selected[i])), { success: "Dodano kroki", onSuccess: () => setPlan(null) })}
            >
              Dodaj zaznaczone kroki
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPlan(null)}>Odrzuć</Button>
          </div>
        </div>
      )}
    </div>
  );
}
