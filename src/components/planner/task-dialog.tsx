"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/shared/fields";
import { ReminderPicker } from "@/components/shared/reminder-picker";
import { PRIORITIES, RECURRENCES } from "@/lib/labels";
import { saveTask } from "@/server/actions/tasks";
import { useAction } from "@/hooks/use-action";

const formSchema = z.object({
  title: z.string().trim().min(1, "Podaj nazwę zadania").max(300),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  scheduled_date: z.string().optional(),
  due_at: z.string().optional(),
  estimated_minutes: z.string().optional(),
  recurrence: z.enum(["none", "daily", "weekdays", "weekly", "monthly"]),
  subject_id: z.string().optional(),
  goal_id: z.string().optional(),
  reminder_offsets: z.array(z.number()),
  custom_reminder: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export type TaskDialogOptions = { subjects: { id: string; name: string }[]; goals: { id: string; title: string }[] };

export function TaskDialog({
  trigger,
  initial,
  id,
  options,
  defaultDate,
}: {
  trigger: React.ReactElement;
  initial?: Partial<FormValues>;
  id?: string;
  options: TaskDialogOptions;
  defaultDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      priority: "medium",
      scheduled_date: defaultDate ?? "",
      due_at: "",
      estimated_minutes: "",
      recurrence: "none",
      subject_id: "",
      goal_id: "",
      reminder_offsets: [],
      custom_reminder: "",
      ...initial,
    },
  });

  const onSubmit = form.handleSubmit((v) =>
    run(
      () =>
        saveTask(
          {
            ...v,
            estimated_minutes: v.estimated_minutes ? Number(v.estimated_minutes) : null,
          },
          id,
        ),
      {
        success: id ? "Zapisano zadanie" : "Dodano zadanie",
        onSuccess: () => {
          setOpen(false);
          if (!id) form.reset();
        },
      },
    ),
  );
  const e = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{id ? "Edytuj zadanie" : "Nowe zadanie"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Nazwa" error={e.title?.message}>
            <Input autoFocus {...form.register("title")} />
          </Field>
          <Field label="Opis">
            <Textarea rows={2} {...form.register("description")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priorytet">
              <NativeSelect {...form.register("priority")}>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Szacowany czas (min)">
              <Input type="number" min={0} step={5} {...form.register("estimated_minutes")} />
            </Field>
            <Field label="Zaplanowane na dzień">
              <Input type="date" {...form.register("scheduled_date")} />
            </Field>
            <Field label="Termin (deadline)">
              <Input type="datetime-local" {...form.register("due_at")} />
            </Field>
            <Field label="Kategoria" hint="np. studia, dom, praca">
              <Input {...form.register("category")} />
            </Field>
            <Field label="Powtarzanie">
              <NativeSelect {...form.register("recurrence")}>
                {RECURRENCES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Przedmiot">
              <NativeSelect {...form.register("subject_id")}>
                <option value="">Brak</option>
                {options.subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Cel">
              <NativeSelect {...form.register("goal_id")}>
                <option value="">Brak</option>
                {options.goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Controller
            control={form.control}
            name="reminder_offsets"
            render={({ field }) => (
              <ReminderPicker
                offsets={field.value}
                onOffsetsChange={field.onChange}
                custom={form.watch("custom_reminder") ?? ""}
                onCustomChange={(v) => form.setValue("custom_reminder", v)}
              />
            )}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
