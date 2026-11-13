"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AiUnavailable } from "@/components/shared/ai-unavailable";
import { BlockList, type Block } from "./timeline";
import { saveTimeBlocks } from "@/server/actions/tasks";
import { useAction } from "@/hooks/use-action";

type PlanBlock = Block & { task_id?: string | null; kind: "focus" | "study" | "class" | "break" | "personal" };

export function AiDayPlanner({ date, aiEnabled, hasBlocks }: { date: string; aiEnabled: boolean; hasBlocks: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<{ summary: string; blocks: PlanBlock[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [replace, setReplace] = useState(true);
  const { pending, run } = useAction();

  if (!aiEnabled) return <AiUnavailable />;

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/plan-day", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, prompt }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPlan(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-3">
      <Textarea
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="np. Mam zajęcia od 8:00 do 14:00, muszę pouczyć się matematyki i zrobić projekt. Wieczorem trening o 19."
      />
      <Button onClick={generate} disabled={loading} className="justify-self-start">
        <Sparkles /> {loading ? "Układam plan..." : "Ułóż plan dnia"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {plan && (
        <div className="grid gap-3 rounded-xl border p-4">
          <p className="text-sm">{plan.summary}</p>
          <BlockList blocks={plan.blocks} />
          {hasBlocks && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={replace} onCheckedChange={(c) => setReplace(Boolean(c))} /> Zastąp obecne bloki tego dnia
            </label>
          )}
          <div className="flex gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                run(() => saveTimeBlocks({ date, replace: hasBlocks && replace, remind: true, blocks: plan.blocks.map((b) => ({ ...b, task_id: b.task_id ?? null, notes: b.notes ?? "" })) }), {
                  success: "Zapisano plan dnia",
                  onSuccess: () => setPlan(null),
                })
              }
            >
              Zapisz plan
            </Button>
            <Button variant="ghost" onClick={() => setPlan(null)}>Odrzuć</Button>
          </div>
        </div>
      )}
    </div>
  );
}
