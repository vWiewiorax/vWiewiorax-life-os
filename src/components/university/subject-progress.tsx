"use client";

import { useState } from "react";
import { updateSubjectProgress } from "@/server/actions/university";
import { useAction } from "@/hooks/use-action";

export function SubjectProgress({ id, value }: { id: string; value: number }) {
  const [v, setV] = useState(value);
  const { run } = useAction();
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={v}
        aria-label="Postęp w przedmiocie"
        className="h-2 flex-1 cursor-pointer accent-primary"
        onChange={(e) => setV(Number(e.target.value))}
        onPointerUp={() => run(() => updateSubjectProgress(id, v))}
        onKeyUp={() => run(() => updateSubjectProgress(id, v))}
      />
      <span className="w-10 text-right text-sm tabular-nums">{v}%</span>
    </div>
  );
}
