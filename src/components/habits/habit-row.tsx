"use client";

import { useState } from "react";
import { Archive, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { HabitDialog } from "./habit-dialog";
import { archiveHabit, deleteHabit, setHabitEntry } from "@/server/actions/goals";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

type Habit = { id: string; title: string; description: string | null; frequency: "daily" | "weekly"; target_per_week: number; color: string; reminder_time: string | null; goal_id: string | null };

export function HabitRow({
  habit,
  days,
  entries,
  today,
  streak,
  rate,
  goals,
}: {
  habit: Habit;
  days: { key: string; label: string }[];
  entries: Record<string, { done: boolean; note: string | null }>;
  today: string;
  streak: number;
  rate: number;
  goals: { id: string; title: string }[];
}) {
  const { run } = useAction();
  const todayEntry = entries[today];
  const [note, setNote] = useState(todayEntry?.note ?? "");
  return (
    <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-[minmax(0,14rem)_1fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium"><span className="size-2.5 shrink-0 rounded-full" style={{ background: habit.color }} /> <span className="truncate">{habit.title}</span></p>
        <p className="text-xs text-muted-foreground">
          {habit.frequency === "daily" ? "codziennie" : `${habit.target_per_week}x w tygodniu`} · seria: {streak} {habit.frequency === "daily" ? "dni" : "tyg."} · 30 dni: {rate}%
        </p>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {days.map((d) => {
          const e = entries[d.key];
          return (
            <button
              key={d.key}
              title={`${d.key}${e?.note ? ` - ${e.note}` : ""}`}
              aria-label={`${d.label} ${d.key}: ${e?.done ? "wykonane" : "niewykonane"}`}
              disabled={d.key > today}
              onClick={() => run(() => setHabitEntry(habit.id, d.key, !e?.done))}
              className={cn("flex size-8 shrink-0 flex-col items-center justify-center rounded-md border text-[10px] transition-colors disabled:opacity-30", d.key === today && "ring-1 ring-primary", e?.done ? "border-transparent text-white" : "hover:bg-muted")}
              style={e?.done ? { background: habit.color } : undefined}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center">
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Notatka do dzisiejszego wpisu" />}>
            <MessageSquare className={todayEntry?.note ? "text-primary" : ""} />
          </PopoverTrigger>
          <PopoverContent className="grid w-72 gap-2">
            <p className="text-xs text-muted-foreground">Notatka do dzisiejszego wpisu</p>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. 30 min zamiast 20" />
            <Button size="sm" onClick={() => run(() => setHabitEntry(habit.id, today, todayEntry?.done ?? true, note), { success: "Zapisano" })}>Zapisz</Button>
          </PopoverContent>
        </Popover>
        <HabitDialog
          id={habit.id}
          goals={goals}
          initial={{ title: habit.title, description: habit.description ?? "", frequency: habit.frequency, target_per_week: String(habit.target_per_week), color: habit.color, reminder_time: habit.reminder_time?.slice(0, 5) ?? "", goal_id: habit.goal_id ?? "" }}
          trigger={<Button variant="ghost" size="icon-sm" aria-label="Edytuj"><Pencil /></Button>}
        />
        <ConfirmButton title="Zarchiwizować nawyk?" description="Historia zostanie zachowana." confirmLabel="Archiwizuj" action={() => archiveHabit(habit.id)} label="Archiwizuj">
          <Archive />
        </ConfirmButton>
        <ConfirmButton title="Usunąć nawyk na zawsze?" description="Usunie też całą historię wykonań." action={() => deleteHabit(habit.id)}>
          <Trash2 />
        </ConfirmButton>
      </div>
    </div>
  );
}
