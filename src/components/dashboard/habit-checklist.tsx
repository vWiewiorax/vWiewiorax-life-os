"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { setHabitEntry } from "@/server/actions/goals";
import { useAction } from "@/hooks/use-action";

export function HabitChecklist({ habits, today }: { habits: { id: string; title: string; color: string; done: boolean; streak: number }[]; today: string }) {
  const { run } = useAction();
  return (
    <ul className="grid gap-1">
      {habits.map((h) => (
        <li key={h.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50">
          <Checkbox checked={h.done} aria-label={h.title} onCheckedChange={(c) => run(() => setHabitEntry(h.id, today, Boolean(c)))} />
          <span className="size-2 rounded-full" style={{ background: h.color }} />
          <span className={`flex-1 text-sm ${h.done ? "text-muted-foreground line-through" : ""}`}>{h.title}</span>
          {h.streak > 0 && <span className="text-xs text-muted-foreground">{h.streak} dni z rzędu</span>}
        </li>
      ))}
    </ul>
  );
}
