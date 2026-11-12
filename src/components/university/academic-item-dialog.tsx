"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/shared/fields";
import { ReminderPicker } from "@/components/shared/reminder-picker";
import { ACADEMIC_KINDS, PRIORITIES, type AcademicKind, type Priority } from "@/lib/labels";
import { saveAcademicItem } from "@/server/actions/university";
import { useAction } from "@/hooks/use-action";

type Values = {
  subject_id: string;
  kind: AcademicKind;
  title: string;
  description: string;
  due_at: string;
  priority: Priority;
  estimated_prep_minutes: string;
  reminder_offsets: number[];
  custom_reminder: string;
};

export function AcademicItemDialog({
  trigger,
  id,
  initial,
  subjects,
  defaultReminders = [1440, 4320],
}: {
  trigger: React.ReactElement;
  id?: string;
  initial?: Partial<Values>;
  subjects: { id: string; name: string }[];
  defaultReminders?: number[];
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const form = useForm<Values>({
    defaultValues: {
      subject_id: "",
      kind: "exam",
      title: "",
      description: "",
      due_at: "",
      priority: "high",
      estimated_prep_minutes: "",
      reminder_offsets: id ? [] : defaultReminders,
      custom_reminder: "",
      ...initial,
    },
  });
  const errors = form.formState.errors;
  const onSubmit = form.handleSubmit((v) => {
    if (!v.title.trim()) return form.setError("title", { message: "Podaj tytuł" });
    if (!v.due_at) return form.setError("due_at", { message: "Podaj datę i godzinę" });
    run(() => saveAcademicItem({ ...v, estimated_prep_minutes: v.estimated_prep_minutes ? Number(v.estimated_prep_minutes) : null }, id), {
      success: id ? "Zapisano" : "Dodano termin",
      onSuccess: () => {
        setOpen(false);
        if (!id) form.reset();
      },
    });
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{id ? "Edytuj termin" : "Nowy egzamin, kolokwium lub zadanie"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rodzaj">
              <NativeSelect {...form.register("kind")}>
                {ACADEMIC_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Przedmiot">
              <NativeSelect {...form.register("subject_id")}>
                <option value="">Brak</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Tytuł" error={errors.title?.message}>
            <Input autoFocus placeholder="np. Kolokwium 1 - całki" {...form.register("title")} />
          </Field>
          <Field label="Opis / zakres materiału">
            <Textarea rows={3} {...form.register("description")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data i godzina" error={errors.due_at?.message}>
              <Input type="datetime-local" {...form.register("due_at")} />
            </Field>
            <Field label="Priorytet">
              <NativeSelect {...form.register("priority")}>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Potrzebny czas nauki (min)" hint="Pomaga AI ułożyć plan">
              <Input type="number" min={0} step={15} {...form.register("estimated_prep_minutes")} />
            </Field>
          </div>
          <Controller
            control={form.control}
            name="reminder_offsets"
            render={({ field }) => (
              <ReminderPicker offsets={field.value} onOffsetsChange={field.onChange} custom={form.watch("custom_reminder")} onCustomChange={(v) => form.setValue("custom_reminder", v)} />
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
