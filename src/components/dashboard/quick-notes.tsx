"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addQuickNote, deleteQuickNote } from "@/server/actions/tasks";
import { useAction } from "@/hooks/use-action";

export function QuickNotes({ notes }: { notes: { id: string; content: string }[] }) {
  const [value, setValue] = useState("");
  const { pending, run } = useAction();
  const submit = () => run(() => addQuickNote(value), { onSuccess: () => setValue("") });
  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <Textarea
          rows={2}
          value={value}
          placeholder="Zapisz myśl, pomysł, coś do zapamiętania..."
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <Button size="icon" onClick={submit} disabled={pending || !value.trim()} aria-label="Dodaj notatkę">
          <Plus />
        </Button>
      </div>
      <ul className="grid gap-1.5">
        {notes.map((n) => (
          <li key={n.id} className="group flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="flex-1 whitespace-pre-wrap">{n.content}</span>
            <button className="text-muted-foreground opacity-60 hover:opacity-100" aria-label="Usuń notatkę" onClick={() => run(() => deleteQuickNote(n.id))}>
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
