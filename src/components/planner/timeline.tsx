"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/shared/fields";
import { deleteTimeBlock, saveTimeBlocks } from "@/server/actions/tasks";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

export const BLOCK_KINDS = [
  { value: "study", label: "Nauka", className: "border-l-primary bg-primary/5" },
  { value: "focus", label: "Praca skupiona", className: "border-l-sky-500 bg-sky-500/5" },
  { value: "class", label: "Zajęcia", className: "border-l-emerald-500 bg-emerald-500/5" },
  { value: "personal", label: "Osobiste", className: "border-l-amber-500 bg-amber-500/5" },
  { value: "break", label: "Przerwa", className: "border-l-muted-foreground/40 bg-muted/40" },
] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number]["value"];
export const blockClass = (k: string) => BLOCK_KINDS.find((b) => b.value === k)?.className ?? "";

export type Block = { id?: string; start_time: string; end_time: string; title: string; kind: string; notes?: string | null };

export function BlockList({ blocks, onDelete }: { blocks: Block[]; onDelete?: (id: string) => void }) {
  return (
    <ol className="grid gap-1.5">
      {blocks.map((b, i) => (
        <li key={b.id ?? i} className={cn("group flex items-start gap-3 rounded-r-lg border-l-4 px-3 py-2", blockClass(b.kind))}>
          <span className="w-24 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
            {b.start_time.slice(0, 5)}-{b.end_time.slice(0, 5)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm">{b.title}</p>
            {b.notes && <p className="text-xs text-muted-foreground">{b.notes}</p>}
          </div>
          {onDelete && b.id && (
            <button className="text-muted-foreground opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Usuń blok" onClick={() => onDelete(b.id!)}>
              <Trash2 className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

export function Timeline({ date, blocks }: { date: string; blocks: Block[] }) {
  const { pending, run } = useAction();
  const [v, setV] = useState({ start_time: "09:00", end_time: "10:00", title: "", kind: "study" as BlockKind });
  return (
    <div className="grid gap-3">
      {blocks.length ? (
        <BlockList blocks={blocks} onDelete={(id) => run(() => deleteTimeBlock(id))} />
      ) : (
        <p className="text-sm text-muted-foreground">Brak bloków czasu. Dodaj je ręcznie albo poproś AI o ułożenie planu.</p>
      )}
      <form
        className="grid grid-cols-2 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.title.trim()) return;
          run(() => saveTimeBlocks({ date, blocks: [v], remind: true }), { onSuccess: () => setV({ ...v, title: "" }) });
        }}
      >
        <Input aria-label="Od" type="time" value={v.start_time} onChange={(e) => setV({ ...v, start_time: e.target.value })} />
        <Input aria-label="Do" type="time" value={v.end_time} onChange={(e) => setV({ ...v, end_time: e.target.value })} />
        <Input className="col-span-2" aria-label="Nazwa bloku" placeholder="Co robisz w tym czasie?" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        <NativeSelect aria-label="Rodzaj" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as BlockKind })}>
          {BLOCK_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline" disabled={pending || !v.title.trim()}>
          <Plus /> Blok
        </Button>
      </form>
    </div>
  );
}
