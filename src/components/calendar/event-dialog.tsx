"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/shared/fields";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { deleteEvent, saveEvent } from "@/server/actions/calendar";
import { useAction } from "@/hooks/use-action";

type Values = { title: string; description: string; location: string; date: string; start_time: string; end_time: string; all_day: boolean; subject_id: string };

export function EventDialog({ trigger, id, initial, subjects }: { trigger: React.ReactElement; id?: string; initial?: Partial<Values>; subjects: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const form = useForm<Values>({
    defaultValues: { title: "", description: "", location: "", date: "", start_time: "10:00", end_time: "11:00", all_day: false, subject_id: "", ...initial },
  });
  const allDay = form.watch("all_day");
  const onSubmit = form.handleSubmit((v) => {
    if (!v.title.trim()) return form.setError("title", { message: "Podaj tytuł" });
    if (!v.date) return form.setError("date", { message: "Podaj datę" });
    run(() => saveEvent(v, id), {
      success: id ? "Zapisano wydarzenie" : "Dodano wydarzenie",
      onSuccess: () => {
        setOpen(false);
        if (!id) form.reset();
      },
    });
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{id ? "Edytuj wydarzenie" : "Nowe wydarzenie"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Tytuł" error={form.formState.errors.title?.message}>
            <Input autoFocus {...form.register("title")} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Data" className="col-span-3 sm:col-span-1" error={form.formState.errors.date?.message}>
              <Input type="date" {...form.register("date")} />
            </Field>
            {!allDay && (
              <>
                <Field label="Od">
                  <Input type="time" {...form.register("start_time")} />
                </Field>
                <Field label="Do">
                  <Input type="time" {...form.register("end_time")} />
                </Field>
              </>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={allDay} onCheckedChange={(c) => form.setValue("all_day", Boolean(c))} /> Cały dzień
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Miejsce">
              <Input {...form.register("location")} />
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
          <Field label="Opis">
            <Textarea rows={2} {...form.register("description")} />
          </Field>
          <DialogFooter className="sm:justify-between">
            {id ? (
              <ConfirmButton title="Usunąć wydarzenie?" action={() => deleteEvent(id)} variant="outline" size="default" onDone={() => setOpen(false)}>
                <Trash2 /> Usuń
              </ConfirmButton>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
