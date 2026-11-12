"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/fields";
import { createCustomReminder, deleteNotification, markNotificationsRead } from "@/server/actions/settings";
import { useAction } from "@/hooks/use-action";

export function CustomReminderForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [at, setAt] = useState("");
  const { pending, run } = useAction();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createCustomReminder({ title, body, scheduled_for: at }), { success: "Dodano przypomnienie", onSuccess: () => { setTitle(""); setBody(""); setAt(""); } });
      }}
    >
      <Field label="Przypomnij mi o"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. Zapisy na zajęcia" /></Field>
      <Field label="Szczegóły"><Input value={body} onChange={(e) => setBody(e.target.value)} /></Field>
      <Field label="Kiedy"><Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></Field>
      <Button type="submit" disabled={pending || !title.trim() || !at}><Plus /> Dodaj</Button>
    </form>
  );
}

export function DeleteNotification({ id }: { id: string }) {
  const { pending, run } = useAction();
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Usuń przypomnienie" disabled={pending} onClick={() => run(() => deleteNotification(id))}>
      <Trash2 />
    </Button>
  );
}

export function MarkRead() {
  const { pending, run } = useAction();
  return <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => markNotificationsRead())}>Oznacz wszystkie jako przeczytane</Button>;
}

export function NotificationLink({ url, children }: { url: string | null; children: React.ReactNode }) {
  return url ? <Link href={url} className="hover:text-primary">{children}</Link> : <>{children}</>;
}
