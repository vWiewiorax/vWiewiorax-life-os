"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/shared/fields";
import { GOAL_CATEGORIES, GOAL_STATUSES, PRIORITIES, type GoalCategory, type GoalStatus, type Priority } from "@/lib/labels";
import { saveGoal } from "@/server/actions/goals";
import { useAction } from "@/hooks/use-action";

type Values = { category: GoalCategory; title: string; description: string; why: string; target_date: string; priority: Priority; status: GoalStatus };

export function GoalDialog({ trigger, id, initial }: { trigger: React.ReactElement; id?: string; initial?: Partial<Values> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();
  const form = useForm<Values>({ defaultValues: { category: "personal", title: "", description: "", why: "", target_date: "", priority: "medium", status: "active", ...initial } });
  const onSubmit = form.handleSubmit((v) => {
    if (!v.title.trim()) return form.setError("title", { message: "Podaj nazwę celu" });
    run(() => saveGoal(v, id), {
      success: id ? "Zapisano cel" : "Dodano cel",
      onSuccess: (d) => {
        setOpen(false);
        if (!id && d) router.push(`/cele/${d.id}`);
      },
    });
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{id ? "Edytuj cel" : "Nowy cel"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Cel" error={form.formState.errors.title?.message}>
            <Input autoFocus placeholder="np. Zdać sesję zimową bez poprawek" {...form.register("title")} />
          </Field>
          <Field label="Opis" hint="Jak wygląda sukces? Po czym poznasz, że cel jest osiągnięty?">
            <Textarea rows={2} {...form.register("description")} />
          </Field>
          <Field label="Dlaczego to dla mnie ważne?">
            <Textarea rows={2} {...form.register("why")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategoria">
              <NativeSelect {...form.register("category")}>
                {GOAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Priorytet">
              <NativeSelect {...form.register("priority")}>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Termin">
              <Input type="date" {...form.register("target_date")} />
            </Field>
            {id && (
              <Field label="Status">
                <NativeSelect {...form.register("status")}>
                  {GOAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </NativeSelect>
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
