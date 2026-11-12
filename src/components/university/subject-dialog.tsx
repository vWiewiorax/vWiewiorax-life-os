"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/fields";
import { SUBJECT_COLORS } from "@/lib/labels";
import { saveSubject } from "@/server/actions/university";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

type Values = {
  name: string;
  code: string;
  color: string;
  professor: string;
  professor_email: string;
  professor_office_hours: string;
  room: string;
  ects: string;
  semester: string;
  description: string;
};

export function SubjectDialog({ trigger, id, initial }: { trigger: React.ReactElement; id?: string; initial?: Partial<Values> }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const form = useForm<Values>({
    defaultValues: { name: "", code: "", color: SUBJECT_COLORS[0], professor: "", professor_email: "", professor_office_hours: "", room: "", ects: "", semester: "", description: "", ...initial },
  });
  const color = form.watch("color");
  const onSubmit = form.handleSubmit((v) => {
    if (!v.name.trim()) return form.setError("name", { message: "Podaj nazwę przedmiotu" });
    run(() => saveSubject({ ...v, ects: v.ects ? Number(v.ects) : null }, id), {
      success: id ? "Zapisano przedmiot" : "Dodano przedmiot",
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
          <DialogTitle>{id ? "Edytuj przedmiot" : "Nowy przedmiot"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field label="Nazwa" error={form.formState.errors.name?.message}>
              <Input autoFocus {...form.register("name")} />
            </Field>
            <Field label="Kod">
              <Input {...form.register("code")} />
            </Field>
          </div>
          <Field label="Kolor">
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-label={`Kolor ${c}`}
                  onClick={() => form.setValue("color", c)}
                  className={cn("size-7 rounded-full ring-offset-2 ring-offset-background transition", color === c && "ring-2 ring-foreground")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prowadzący">
              <Input {...form.register("professor")} />
            </Field>
            <Field label="E-mail prowadzącego">
              <Input type="email" {...form.register("professor_email")} />
            </Field>
            <Field label="Konsultacje">
              <Input placeholder="np. wt 12:00-13:00, p. 204" {...form.register("professor_office_hours")} />
            </Field>
            <Field label="Sala">
              <Input {...form.register("room")} />
            </Field>
            <Field label="ECTS">
              <Input type="number" step="0.5" min={0} {...form.register("ects")} />
            </Field>
            <Field label="Semestr">
              <Input placeholder="np. zimowy 2026/27" {...form.register("semester")} />
            </Field>
          </div>
          <Field label="Opis / wymagania zaliczenia">
            <Textarea rows={3} {...form.register("description")} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
