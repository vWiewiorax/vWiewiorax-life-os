import { z } from "zod";

const optionalText = (max = 5000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Podaj datę i godzinę");
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę");
const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(dateKey.nullable());
const time = z.string().regex(/^\d{2}:\d{2}/, "Podaj godzinę");

export const priority = z.enum(["low", "medium", "high", "urgent"]);

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę przedmiotu").max(200),
  code: optionalText(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  professor: optionalText(200),
  professor_email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.email("Niepoprawny e-mail").nullable()),
  professor_office_hours: optionalText(200),
  room: optionalText(100),
  ects: z.coerce.number().min(0).max(60).optional().nullable(),
  semester: optionalText(50),
  description: optionalText(),
});

export const classSessionSchema = z.object({
  subject_id: z.uuid(),
  kind: z.string().trim().min(1).max(50),
  weekday: z.coerce.number().int().min(1).max(7),
  start_time: time,
  end_time: time,
  location: optionalText(100),
});

export const reminderFields = {
  reminder_offsets: z.array(z.coerce.number().int().min(0).max(60 * 24 * 60)).default([]),
  custom_reminder: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
};

export const academicItemSchema = z.object({
  subject_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
  kind: z.enum(["exam", "test", "assignment", "project"]),
  title: z.string().trim().min(1, "Podaj tytuł").max(300),
  description: optionalText(),
  due_at: localDateTime,
  priority,
  estimated_prep_minutes: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  ...reminderFields,
});

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Podaj nazwę zadania").max(300),
  description: optionalText(),
  category: optionalText(60),
  priority,
  scheduled_date: optionalDate,
  due_at: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  estimated_minutes: z.coerce.number().int().min(0).max(10000).optional().nullable(),
  recurrence: z.enum(["none", "daily", "weekdays", "weekly", "monthly"]),
  subject_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
  goal_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
  ...reminderFields,
});

export const timeBlockSchema = z.object({
  block_date: dateKey,
  start_time: time,
  end_time: time,
  title: z.string().trim().min(1).max(200),
  kind: z.enum(["focus", "study", "class", "break", "personal"]),
  task_id: z.uuid().nullable().optional(),
  notes: optionalText(1000),
});

export const eventSchema = z.object({
  title: z.string().trim().min(1, "Podaj tytuł").max(300),
  description: optionalText(),
  location: optionalText(200),
  date: dateKey,
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  all_day: z.boolean().default(false),
  subject_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
});

export const goalSchema = z.object({
  category: z.enum(["education", "career", "health", "finances", "relationships", "personal", "hobbies", "other"]),
  title: z.string().trim().min(1, "Podaj nazwę celu").max(300),
  description: optionalText(),
  why: optionalText(),
  target_date: optionalDate,
  priority,
  status: z.enum(["active", "paused", "completed", "abandoned"]).default("active"),
});

export const habitSchema = z.object({
  title: z.string().trim().min(1, "Podaj nazwę nawyku").max(200),
  description: optionalText(1000),
  frequency: z.enum(["daily", "weekly"]),
  target_per_week: z.coerce.number().int().min(1).max(7),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  reminder_time: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  goal_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
});

export const journalSchema = z.object({
  entry_date: dateKey,
  title: optionalText(200),
  mood: z.coerce.number().int().min(1).max(5).optional().nullable(),
  content: z.string().max(50000).default(""),
  answers: z.record(z.string(), z.string().max(5000)).default({}),
  gratitude: optionalText(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const customReminderSchema = z.object({
  title: z.string().trim().min(1, "Podaj treść przypomnienia").max(200),
  body: optionalText(1000),
  scheduled_for: localDateTime,
});

export const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(100),
  timezone: z.string().min(1).max(64),
  notification_email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.email("Niepoprawny e-mail").nullable()),
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  default_reminder_offsets: z.array(z.coerce.number().int()).default([]),
  ai_journal_access: z.boolean(),
  ai_context_enabled: z.boolean(),
  day_start: time,
  day_end: time,
});

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

export function zodError(e: z.ZodError) {
  return e.issues[0]?.message ?? "Niepoprawne dane";
}
