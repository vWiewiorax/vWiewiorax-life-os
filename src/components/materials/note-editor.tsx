"use client";

import { useState } from "react";
import { Download, Eye, Pencil, Printer, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/shared/fields";
import { Markdown } from "@/components/shared/markdown";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { deleteNote, saveNote } from "@/server/actions/notes";
import { useAction } from "@/hooks/use-action";

export function NoteEditor({ note, subjects }: { note: { id: string; title: string; content: string; subject_id: string | null }; subjects: { id: string; name: string }[] }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [subject, setSubject] = useState(note.subject_id ?? "");
  const [editing, setEditing] = useState(!note.content);
  const { pending, run } = useAction();
  const dirty = title !== note.title || content !== note.content || subject !== (note.subject_id ?? "");
  const save = () => run(() => saveNote({ title, content, subject_id: subject || null }, note.id), { success: "Zapisano notatkę" });
  const exportMd = () => {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^\p{L}\p{N} _-]+/gu, "").trim() || "notatka"}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Input className="min-w-60 flex-1 text-base font-medium" aria-label="Tytuł" value={title} onChange={(e) => setTitle(e.target.value)} />
        <NativeSelect className="w-auto" aria-label="Przedmiot" value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">Bez przedmiotu</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </NativeSelect>
        <Button variant="outline" onClick={() => setEditing(!editing)}>{editing ? <><Eye /> Podgląd</> : <><Pencil /> Edytuj</>}</Button>
        <Button onClick={save} disabled={pending || !dirty}><Save /> Zapisz</Button>
        <Button variant="outline" size="icon" aria-label="Eksportuj do Markdown" title="Eksportuj do Markdown" onClick={exportMd}><Download /></Button>
        <Button variant="outline" size="icon" aria-label="Drukuj / zapisz jako PDF" title="Drukuj / zapisz jako PDF" onClick={() => window.print()}><Printer /></Button>
        <ConfirmButton title="Usunąć notatkę?" action={() => deleteNote(note.id)} variant="outline" size="icon" redirectTo="/materialy" label="Usuń notatkę">
          <Trash2 />
        </ConfirmButton>
      </div>
      <h1 className="hidden text-2xl font-semibold print:block">{title}</h1>
      {editing ? (
        <Textarea className="min-h-[65vh] font-mono text-sm" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Pisz w Markdown: # nagłówek, - lista, **pogrubienie**" />
      ) : (
        <div className="rounded-xl border p-6 print:border-0 print:p-0">{content ? <Markdown>{content}</Markdown> : <p className="text-sm text-muted-foreground">Pusta notatka.</p>}</div>
      )}
    </div>
  );
}
