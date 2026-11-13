import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type Priority = Enums["priority"];
export type AcademicKind = Enums["academic_kind"];
export type GoalCategory = Enums["goal_category"];
export type GoalStatus = Enums["goal_status"];
export type MaterialKind = Enums["material_kind"];
export type Recurrence = Enums["recurrence"];
export type TaskStatus = Enums["task_status"];
export type NoteKind = Enums["note_kind"];

export const PRIORITIES: { value: Priority; label: string; className: string }[] = [
  { value: "low", label: "Niski", className: "bg-muted text-muted-foreground" },
  { value: "medium", label: "Średni", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { value: "high", label: "Wysoki", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { value: "urgent", label: "Pilny", className: "bg-red-500/15 text-red-700 dark:text-red-300" },
];
export const priorityLabel = (p: Priority) => PRIORITIES.find((x) => x.value === p)?.label ?? p;
export const priorityClass = (p: Priority) => PRIORITIES.find((x) => x.value === p)?.className ?? "";
export const priorityRank: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export const ACADEMIC_KINDS: { value: AcademicKind; label: string }[] = [
  { value: "exam", label: "Egzamin" },
  { value: "test", label: "Kolokwium" },
  { value: "assignment", label: "Zadanie" },
  { value: "project", label: "Projekt" },
];
export const academicKindLabel = (k: AcademicKind) => ACADEMIC_KINDS.find((x) => x.value === k)?.label ?? k;

export const GOAL_CATEGORIES: { value: GoalCategory; label: string }[] = [
  { value: "education", label: "Edukacja" },
  { value: "career", label: "Kariera" },
  { value: "health", label: "Zdrowie i forma" },
  { value: "finances", label: "Finanse" },
  { value: "relationships", label: "Relacje" },
  { value: "personal", label: "Rozwój osobisty" },
  { value: "hobbies", label: "Pasje" },
  { value: "other", label: "Inne" },
];
export const goalCategoryLabel = (c: GoalCategory) => GOAL_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export const GOAL_STATUSES: { value: GoalStatus; label: string }[] = [
  { value: "active", label: "Aktywny" },
  { value: "paused", label: "Wstrzymany" },
  { value: "completed", label: "Osiągnięty" },
  { value: "abandoned", label: "Porzucony" },
];
export const goalStatusLabel = (s: GoalStatus) => GOAL_STATUSES.find((x) => x.value === s)?.label ?? s;

export const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: "none", label: "Bez powtarzania" },
  { value: "daily", label: "Codziennie" },
  { value: "weekdays", label: "Dni robocze" },
  { value: "weekly", label: "Co tydzień" },
  { value: "monthly", label: "Co miesiąc" },
];

export const MATERIAL_KINDS: Record<MaterialKind, string> = {
  pdf: "PDF",
  audio: "Nagranie",
  presentation: "Prezentacja",
  image: "Zdjęcie notatek",
  text: "Notatki tekstowe",
  other: "Inny plik",
};

export const NOTE_KINDS: Record<NoteKind, string> = {
  lecture_notes: "Notatki AI",
  summary: "Podsumowanie",
  explanation: "Wyjaśnienie",
  exam_prep: "Przygotowanie do egzaminu",
  study_plan: "Plan nauki",
  manual: "Notatka własna",
};

export const WEEKDAYS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

export const REMINDER_OFFSETS: { value: number; label: string }[] = [
  { value: 60, label: "1 godzinę przed" },
  { value: 1440, label: "1 dzień przed" },
  { value: 4320, label: "3 dni przed" },
  { value: 10080, label: "1 tydzień przed" },
];

export const SUBJECT_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#64748b"];
