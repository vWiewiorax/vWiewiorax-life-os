"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addGoalReflection, deleteGoalReflection } from "@/server/actions/goals";
import { useAction } from "@/hooks/use-action";
import { formatDate } from "@/lib/dates";

export function Reflections({ goalId, items }: { goalId: string; items: { id: string; content: string; created_at: string }[] }) {
  const [v, setV] = useState("");
  const { pending, run } = useAction();
  return (
    <div className="grid gap-3">
      <Textarea rows={2} value={v} onChange={(e) => setV(e.target.value)} placeholder="Notatka lub refleksja: co działa, co nie, co czuję w związku z tym celem..." />
      <Button size="sm" variant="outline" className="justify-self-start" disabled={pending || !v.trim()} onClick={() => run(() => addGoalReflection(goalId, v), { onSuccess: () => setV("") })}>
        Dodaj refleksję
      </Button>
      {items.map((r) => (
        <div key={r.id} className="group rounded-lg bg-muted/50 p-3 text-sm">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            {formatDate(r.created_at, undefined, { day: "numeric", month: "long", year: "numeric" })}
            <button className="opacity-60 hover:opacity-100" aria-label="Usuń refleksję" onClick={() => run(() => deleteGoalReflection(r.id))}><X className="size-3.5" /></button>
          </div>
          <p className="whitespace-pre-wrap">{r.content}</p>
        </div>
      ))}
    </div>
  );
}
