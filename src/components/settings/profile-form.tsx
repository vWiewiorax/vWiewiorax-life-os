"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/shared/fields";
import { REMINDER_OFFSETS } from "@/lib/labels";
import { saveProfile } from "@/server/actions/settings";
import { useAction } from "@/hooks/use-action";

type Values = {
  display_name: string;
  timezone: string;
  notification_email: string;
  email_notifications: boolean;
  push_notifications: boolean;
  default_reminder_offsets: number[];
  ai_journal_access: boolean;
  ai_context_enabled: boolean;
  day_start: string;
  day_end: string;
};

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function ProfileForm({ initial, emailConfigured }: { initial: Values; emailConfigured: boolean }) {
  const { pending, run } = useAction();
  const form = useForm<Values>({ defaultValues: initial });
  const v = form.watch();
  const onSubmit = form.handleSubmit((values) => run(() => saveProfile(values), { success: "Zapisano ustawienia" }));
  return (
    <form onSubmit={onSubmit} className="grid gap-8">
      <section className="grid gap-4">
        <h2 className="text-sm font-semibold">Profil</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Jak mam się do Ciebie zwracać"><Input {...form.register("display_name")} /></Field>
          <Field label="Strefa czasowa"><Input {...form.register("timezone")} placeholder="Europe/Warsaw" /></Field>
          <Field label="Mój dzień zaczyna się o" hint="Używane przez AI przy planowaniu dnia"><Input type="time" {...form.register("day_start")} /></Field>
          <Field label="Mój dzień kończy się o"><Input type="time" {...form.register("day_end")} /></Field>
        </div>
      </section>
      <section className="grid gap-4">
        <h2 className="text-sm font-semibold">Przypomnienia</h2>
        <Toggle label="Powiadomienia push" hint="Na urządzeniach, na których je włączysz poniżej" checked={v.push_notifications} onChange={(c) => form.setValue("push_notifications", c)} />
        <Toggle label="Powiadomienia e-mail" hint={emailConfigured ? undefined : "Serwer nie ma skonfigurowanego SMTP - e-maile nie będą wysyłane"} checked={v.email_notifications} onChange={(c) => form.setValue("email_notifications", c)} />
        <Field label="Adres e-mail do przypomnień"><Input type="email" {...form.register("notification_email")} /></Field>
        <Field label="Domyślne przypomnienia dla egzaminów i terminów">
          <div className="flex flex-wrap gap-2">
            {REMINDER_OFFSETS.map((o) => {
              const on = v.default_reminder_offsets.includes(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => form.setValue("default_reminder_offsets", on ? v.default_reminder_offsets.filter((x) => x !== o.value) : [...v.default_reminder_offsets, o.value])}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </Field>
      </section>
      <section className="grid gap-4">
        <h2 className="text-sm font-semibold">Prywatność AI</h2>
        <Toggle label="Asystent widzi dane z aplikacji" hint="Przedmioty, terminy, zadania, plan, cele, nawyki, materiały" checked={v.ai_context_enabled} onChange={(c) => form.setValue("ai_context_enabled", c)} />
        <Toggle label="Asystent może czytać dziennik" hint="Domyślnie wyłączone. Nawet wtedy dziennik trafia do AI tylko w rozmowach, w których to zaznaczysz." checked={v.ai_journal_access} onChange={(c) => form.setValue("ai_journal_access", c)} />
      </section>
      <Button type="submit" className="justify-self-start" disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz ustawienia"}</Button>
    </form>
  );
}
