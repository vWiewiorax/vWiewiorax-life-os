"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/shared/fields";
import { PriorityBadge, Pill } from "@/components/shared/badges";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { EmptyState } from "@/components/shared/page-header";
import { AcademicItemDialog } from "./academic-item-dialog";
import { ACADEMIC_KINDS, PRIORITIES, academicKindLabel, type AcademicKind, type Priority } from "@/lib/labels";
import { deleteAcademicItem, toggleAcademicItem } from "@/server/actions/university";
import { useAction } from "@/hooks/use-action";
import { formatDateTime, isoToLocalInput, relativeDays, toDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type AcademicItem = {
  id: string;
  subject_id: string | null;
  kind: AcademicKind;
  title: string;
  description: string | null;
  due_at: string;
  priority: Priority;
  completed: boolean;
  estimated_prep_minutes: number | null;
};

export function AcademicList({
  items,
  subjects,
  tz,
  today,
  hideSubjectFilter,
}: {
  items: AcademicItem[];
  subjects: { id: string; name: string; color: string }[];
  tz: string;
  today: string;
  hideSubjectFilter?: boolean;
}) {
  const [subject, setSubject] = useState("");
  const [kind, setKind] = useState("");
  const [priority, setPriority] = useState("");
  const [showDone, setShowDone] = useState(false);
  const { run } = useAction();
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const filtered = items.filter(
    (i) => (!subject || i.subject_id === subject) && (!kind || i.kind === kind) && (!priority || i.priority === priority) && (showDone || !i.completed),
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {!hideSubjectFilter && (
          <NativeSelect className="w-auto" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Filtruj po przedmiocie">
            <option value="">Wszystkie przedmioty</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </NativeSelect>
        )}
        <NativeSelect className="w-auto" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filtruj po rodzaju">
          <option value="">Wszystkie rodzaje</option>
          {ACADEMIC_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </NativeSelect>
        <NativeSelect className="w-auto" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filtruj po priorytecie">
          <option value="">Każdy priorytet</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </NativeSelect>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={showDone} onCheckedChange={(c) => setShowDone(Boolean(c))} /> Pokaż ukończone
        </label>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Brak terminów" description="Dodaj egzamin, kolokwium, zadanie albo projekt." />
      ) : (
        <ul className="divide-y rounded-xl border">
          {filtered.map((i) => {
            const s = i.subject_id ? subjectMap.get(i.subject_id) : undefined;
            const key = toDateKey(i.due_at, tz);
            const past = key < today;
            return (
              <li key={i.id} className="group flex items-start gap-3 p-3">
                <Checkbox
                  className="mt-0.5"
                  checked={i.completed}
                  aria-label="Ukończone"
                  onCheckedChange={(c) => run(() => toggleAcademicItem(i.id, Boolean(c)))}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", i.completed && "text-muted-foreground line-through")}>{i.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Pill>{academicKindLabel(i.kind)}</Pill>
                    {s && <Pill color={s.color}>{s.name}</Pill>}
                    <PriorityBadge priority={i.priority} />
                    <span>{formatDateTime(i.due_at, tz)}</span>
                    {!i.completed && <span className={cn("font-medium", past ? "text-red-600 dark:text-red-400" : "text-foreground")}>{relativeDays(key, today)}</span>}
                  </div>
                  {i.description && <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{i.description}</p>}
                </div>
                <div className="flex shrink-0 items-center sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                  <AcademicItemDialog
                    id={i.id}
                    subjects={subjects}
                    trigger={<Button variant="ghost" size="icon-sm" aria-label="Edytuj"><Pencil /></Button>}
                    initial={{
                      subject_id: i.subject_id ?? "",
                      kind: i.kind,
                      title: i.title,
                      description: i.description ?? "",
                      due_at: isoToLocalInput(i.due_at, tz),
                      priority: i.priority,
                      estimated_prep_minutes: i.estimated_prep_minutes ? String(i.estimated_prep_minutes) : "",
                    }}
                  />
                  <ConfirmButton title="Usunąć termin?" description={i.title} action={() => deleteAcademicItem(i.id)}>
                    <Trash2 />
                  </ConfirmButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
