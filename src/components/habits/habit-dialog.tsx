"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/shared/fields";
import { SUBJECT_COLORS } from "@/lib/labels";
import { saveHabit } from "@/server/actions/goals";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

type Values = { title: string; description: string; frequency: "daily" | "weekly"; target_per_week: string; color: string; reminder_time: string; goal_id: string };

export function HabitDialog({ trigger, id, initial, goals }: { trigger: React.ReactElement; id?: string; initial?: Partial<Values>; goals: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const form = useForm<Values>({ defaultValues: { title: "", description: "", frequency: "daily", target_per_week: "7", color: "#10b981", reminder_time: "", goal_id: "", ...initial } });
  const freq = form.watch("frequency");
  const color = form.watch("color");
  const onSubmit = form.handleSubmit((v) => {
    if (!v.title.trim()) return form.setError("title", { message: "Podaj nazwę nawyku" });
    run(() => saveHabit({ ...v, target_per_week: v.frequency === "daily" ? 7 : Number(v.target_per_week) }, id), {
      success: id ? "Zapisano nawyk" : "Dodano nawyk",
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
        <DialogHeader><DialogTitle>{id ? "Edytuj nawyk" : "Nowy nawyk"}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Nawyk" error={form.formState.errors.title?.message}>
            <Input autoFocus placeholder="np. Czytanie 20 minut" {...form.register("title")} />
          </Field>
          <Field label="Opis (opcjonalnie)"><Input {...form.register("description")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Częstotliwość">
              <NativeSelect {...form.register("frequency")}>
                <option value="daily">Codziennie</option>
                <option value="weekly">X razy w tygodniu</option>
              </NativeSelect>
            </Field>
            {freq === "weekly" && (
              <Field label="Ile razy w tygodniu">
                <Input type="number" min={1} max={7} {...form.register("target_per_week")} />
              </Field>
            )}
            <Field label="Przypomnienie o godzinie">
              <Input type="time" {...form.register("reminder_time")} />
            </Field>
            <Field label="Powiązany cel">
              <NativeSelect {...form.register("goal_id")}>
                <option value="">Brak</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Kolor">
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button type="button" key={c} aria-label={`Kolor ${c}`} onClick={() => form.setValue("color", c)} className={cn("size-7 rounded-full ring-offset-2 ring-offset-background", color === c && "ring-2 ring-foreground")} style={{ background: c }} />
              ))}
            </div>
          </Field>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
