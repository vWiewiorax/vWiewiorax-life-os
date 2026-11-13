"use client";

import { ArrowRight, Pencil, Repeat, Trash2, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PriorityBadge, Pill } from "@/components/shared/badges";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { TaskDialog, type TaskDialogOptions } from "./task-dialog";
import { deleteTask, postponeTasks, setTaskDone } from "@/server/actions/tasks";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";
import { minutesLabel, isoToLocalInput } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export function TaskItem({ task, options, tz, showDate }: { task: TaskRow; options: TaskDialogOptions; tz: string; showDate?: boolean }) {
  const { pending, run } = useAction();
  const done = task.status === "done";
  return (
    <div className={cn("group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50", pending && "opacity-60")}>
      <Checkbox className="mt-0.5" checked={done} aria-label="Ukończone" onCheckedChange={(c) => run(() => setTaskDone(task.id, Boolean(c)))} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-5", done && "text-muted-foreground line-through")}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          {task.estimated_minutes ? (
            <Pill>
              <Clock className="size-3" />
              {minutesLabel(task.estimated_minutes)}
            </Pill>
          ) : null}
          {task.category && <Pill>{task.category}</Pill>}
          {task.recurrence !== "none" && (
            <Pill>
              <Repeat className="size-3" />
              cykliczne
            </Pill>
          )}
          {showDate && task.scheduled_date && <Pill>{task.scheduled_date}</Pill>}
          {task.postponed_count >= 2 && <Pill className="bg-amber-500/10 text-amber-700 dark:text-amber-300">odkładane {task.postponed_count}x</Pill>}
        </div>
      </div>
      <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        {!done && (
          <Button variant="ghost" size="icon-sm" aria-label="Przenieś na jutro" title="Przenieś na jutro" onClick={() => run(() => postponeTasks([task.id]), { success: "Przeniesiono na jutro" })}>
            <ArrowRight />
          </Button>
        )}
        <TaskDialog
          id={task.id}
          options={options}
          trigger={<Button variant="ghost" size="icon-sm" aria-label="Edytuj"><Pencil /></Button>}
          initial={{
            title: task.title,
            description: task.description ?? "",
            category: task.category ?? "",
            priority: task.priority,
            scheduled_date: task.scheduled_date ?? "",
            due_at: task.due_at ? isoToLocalInput(task.due_at, tz) : "",
            estimated_minutes: task.estimated_minutes ? String(task.estimated_minutes) : "",
            recurrence: task.recurrence,
            subject_id: task.subject_id ?? "",
            goal_id: task.goal_id ?? "",
          }}
        />
        <ConfirmButton title="Usunąć zadanie?" description={task.title} action={() => deleteTask(task.id)}>
          <Trash2 />
        </ConfirmButton>
      </div>
    </div>
  );
}
