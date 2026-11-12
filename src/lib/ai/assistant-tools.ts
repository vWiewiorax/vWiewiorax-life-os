import "server-only";
import { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { saveTask } from "@/server/actions/tasks";
import { saveEvent } from "@/server/actions/calendar";
import { saveNote } from "@/server/actions/notes";
import { addMilestones, saveGoal, setGoalProgress } from "@/server/actions/goals";
import { saveAcademicItem } from "@/server/actions/university";
import { createCustomReminder } from "@/server/actions/settings";
import type { ActionResult } from "@/lib/validation";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const localDT = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const prio = z.enum(["low", "medium", "high", "urgent"]);

/** Every write action is only proposed by the model; it runs after the user confirms it in the UI. */
export const ACTIONS = {
  create_task: {
    label: "Nowe zadanie",
    description: "Tworzy zadanie w planerze.",
    schema: z.object({
      title: z.string().min(1).max(300),
      description: z.string().max(2000).optional(),
      priority: prio.default("medium"),
      scheduled_date: date.optional(),
      due_at: localDT.optional().describe("termin YYYY-MM-DDTHH:mm, czas lokalny"),
      estimated_minutes: z.number().int().min(0).max(1440).optional(),
      category: z.string().max(60).optional(),
      subject_id: z.string().optional(),
      goal_id: z.string().optional(),
    }),
    run: (a: Record<string, unknown>) => saveTask({ recurrence: "none", reminder_offsets: [], ...a } as unknown as Parameters<typeof saveTask>[0]),
  },
  create_event: {
    label: "Nowe wydarzenie w kalendarzu",
    description: "Dodaje wydarzenie do kalendarza.",
    schema: z.object({
      title: z.string().min(1).max(300),
      date,
      start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      all_day: z.boolean().default(false),
      location: z.string().max(200).optional(),
      description: z.string().max(2000).optional(),
      subject_id: z.string().optional(),
    }),
    run: (a: Record<string, unknown>) => saveEvent(a as Parameters<typeof saveEvent>[0]),
  },
  create_academic_item: {
    label: "Nowy termin na uczelni",
    description: "Dodaje egzamin, kolokwium, zadanie lub projekt.",
    schema: z.object({
      kind: z.enum(["exam", "test", "assignment", "project"]),
      title: z.string().min(1).max(300),
      due_at: localDT,
      subject_id: z.string().optional(),
      priority: prio.default("medium"),
      description: z.string().max(2000).optional(),
      reminder_offsets: z.array(z.number().int()).default([1440, 4320]),
    }),
    run: (a: Record<string, unknown>) => saveAcademicItem(a as Parameters<typeof saveAcademicItem>[0]),
  },
  create_note: {
    label: "Nowa notatka",
    description: "Zapisuje notatkę (Markdown) w materiałach, np. plan nauki.",
    schema: z.object({ title: z.string().min(1).max(300), content: z.string().min(1).max(100000), subject_id: z.string().optional() }),
    run: (a: Record<string, unknown>) => saveNote({ subject_id: null, ...(a as { title: string; content: string }) }),
  },
  create_goal: {
    label: "Nowy cel",
    description: "Tworzy cel osobisty.",
    schema: z.object({
      title: z.string().min(1).max(300),
      category: z.enum(["education", "career", "health", "finances", "relationships", "personal", "hobbies", "other"]),
      description: z.string().max(3000).optional(),
      why: z.string().max(3000).optional(),
      target_date: date.optional(),
      priority: prio.default("medium"),
    }),
    run: (a: Record<string, unknown>) => saveGoal(a as Parameters<typeof saveGoal>[0]),
  },
  update_goal_progress: {
    label: "Aktualizacja postępu celu",
    description: "Ustawia postęp celu w procentach (gdy cel nie ma kroków).",
    schema: z.object({ goal_id: z.string(), progress: z.number().int().min(0).max(100) }),
    run: (a: Record<string, unknown>) => setGoalProgress(String(a.goal_id), Number(a.progress)),
  },
  add_milestones: {
    label: "Nowe kroki celu",
    description: "Dodaje kroki (kamienie milowe) do istniejącego celu.",
    schema: z.object({ goal_id: z.string(), milestones: z.array(z.object({ title: z.string().min(1).max(300), due_date: date.optional() })).min(1).max(15) }),
    run: (a: Record<string, unknown>) => addMilestones(String(a.goal_id), a.milestones as { title: string; due_date?: string }[]),
  },
  create_reminder: {
    label: "Nowe przypomnienie",
    description: "Ustawia jednorazowe przypomnienie (push/e-mail).",
    schema: z.object({ title: z.string().min(1).max(200), body: z.string().max(1000).optional(), scheduled_for: localDT }),
    run: (a: Record<string, unknown>) => createCustomReminder(a as Parameters<typeof createCustomReminder>[0]),
  },
} satisfies Record<string, { label: string; description: string; schema: z.ZodObject; run: (a: Record<string, unknown>) => Promise<ActionResult<unknown>> }>;

export type ActionName = keyof typeof ACTIONS;

export const SEARCH_TOOL = "search_materials";

export function toolDefinitions(): ChatCompletionTool[] {
  const defs: ChatCompletionTool[] = Object.entries(ACTIONS).map(([name, a]) => ({
    type: "function",
    function: { name, description: `${a.description} Wymaga potwierdzenia przez użytkownika.`, parameters: z.toJSONSchema(a.schema) as Record<string, unknown> },
  }));
  defs.push({
    type: "function",
    function: {
      name: SEARCH_TOOL,
      description: "Przeszukuje wgrane materiały do nauki (semantycznie) i zwraca pasujące fragmenty.",
      parameters: { type: "object", properties: { query: { type: "string" }, subject_id: { type: "string" } }, required: ["query"] },
    },
  });
  return defs;
}

export type PendingAction = { id: string; name: ActionName; label: string; args: Record<string, unknown>; status: "pending" | "done" | "rejected" | "error"; error?: string };

export function summarizeArgs(name: ActionName, a: Record<string, unknown>) {
  const parts = [a.title, a.date, a.scheduled_date, a.due_at, a.scheduled_for, a.start_time && `${a.start_time}-${a.end_time ?? ""}`, a.progress !== undefined && `${a.progress}%`].filter(Boolean);
  if (name === "add_milestones") return (a.milestones as { title: string }[]).map((m) => m.title).join("; ");
  return parts.join(" · ");
}
