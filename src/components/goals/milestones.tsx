"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { addMilestones, deleteMilestone, setGoalProgress, toggleMilestone } from "@/server/actions/goals";
import { useAction } from "@/hooks/use-action";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type M = { id: string; title: string; due_date: string | null; done: boolean };

export function Milestones({ goalId, items }: { goalId: string; items: M[] }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const { pending, run } = useAction();
  return (
    <div className="grid gap-2">
      {items.map((m) => (
        <div key={m.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50">
          <Checkbox checked={m.done} aria-label={m.title} onCheckedChange={(c) => run(() => toggleMilestone(m.id, Boolean(c)))} />
          <span className={cn("flex-1 text-sm", m.done && "text-muted-foreground line-through")}>{m.title}</span>
          {m.due_date && <span className="text-xs text-muted-foreground">{formatDate(m.due_date, undefined, { day: "numeric", month: "short" })}</span>}
          <button className="text-muted-foreground opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Usuń krok" onClick={() => run(() => deleteMilestone(m.id))}>
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          run(() => addMilestones(goalId, [{ title, due_date: due || null }]), { onSuccess: () => { setTitle(""); setDue(""); } });
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nowy krok / kamień milowy" />
        <Input type="date" aria-label="Termin kroku" className="w-40" value={due} onChange={(e) => setDue(e.target.value)} />
        <Button type="submit" variant="outline" size="icon" aria-label="Dodaj krok" disabled={pending || !title.trim()}><Plus /></Button>
      </form>
    </div>
  );
}

export function GoalProgress({ id, value, auto }: { id: string; value: number; auto: boolean }) {
  const [v, setV] = useState(value);
  const { run } = useAction();
  if (auto) return <p className="text-xs text-muted-foreground">Postęp liczony automatycznie z ukończonych kroków: {value}%</p>;
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={0} max={100} step={5} value={v} aria-label="Postęp celu" className="h-2 flex-1 cursor-pointer accent-primary" onChange={(e) => setV(Number(e.target.value))} onPointerUp={() => run(() => setGoalProgress(id, v))} onKeyUp={() => run(() => setGoalProgress(id, v))} />
      <span className="w-10 text-right text-sm tabular-nums">{v}%</span>
    </div>
  );
}
