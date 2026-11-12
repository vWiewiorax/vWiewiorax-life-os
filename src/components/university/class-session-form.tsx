"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/shared/fields";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { WEEKDAYS } from "@/lib/labels";
import { addClassSession, deleteClassSession } from "@/server/actions/university";
import { useAction } from "@/hooks/use-action";

export type ClassSession = { id: string; kind: string; weekday: number; start_time: string; end_time: string; location: string | null };

export function ClassSessions({ subjectId, sessions }: { subjectId: string; sessions: ClassSession[] }) {
  const [v, setV] = useState({ kind: "wykład", weekday: "1", start_time: "08:00", end_time: "09:30", location: "" });
  const { pending, run } = useAction();
  return (
    <div className="grid gap-3">
      {sessions.length > 0 && (
        <ul className="grid gap-1">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="w-28 font-medium">{WEEKDAYS[s.weekday - 1]}</span>
              <span className="tabular-nums">{s.start_time.slice(0, 5)}-{s.end_time.slice(0, 5)}</span>
              <span className="text-muted-foreground">{s.kind}</span>
              {s.location && <span className="text-muted-foreground">· {s.location}</span>}
              <span className="ml-auto">
                <ConfirmButton title="Usunąć zajęcia z planu?" action={() => deleteClassSession(s.id)}>
                  <Trash2 />
                </ConfirmButton>
              </span>
            </li>
          ))}
        </ul>
      )}
      <form
        className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto_auto_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addClassSession({ subject_id: subjectId, ...v, weekday: Number(v.weekday) }), { success: "Dodano zajęcia" });
        }}
      >
        <NativeSelect aria-label="Rodzaj zajęć" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>
          {["wykład", "ćwiczenia", "laboratorium", "seminarium", "projekt", "lektorat"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Dzień tygodnia" value={v.weekday} onChange={(e) => setV({ ...v, weekday: e.target.value })}>
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i + 1}>{d}</option>
          ))}
        </NativeSelect>
        <Input aria-label="Od" type="time" value={v.start_time} onChange={(e) => setV({ ...v, start_time: e.target.value })} />
        <Input aria-label="Do" type="time" value={v.end_time} onChange={(e) => setV({ ...v, end_time: e.target.value })} />
        <Input aria-label="Sala" placeholder="Sala" value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} />
        <Button type="submit" variant="outline" disabled={pending}>
          <Plus /> Dodaj
        </Button>
      </form>
    </div>
  );
}
