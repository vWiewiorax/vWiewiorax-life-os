"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { REMINDER_OFFSETS } from "@/lib/labels";

export function ReminderPicker({
  offsets,
  onOffsetsChange,
  custom,
  onCustomChange,
}: {
  offsets: number[];
  onOffsetsChange: (v: number[]) => void;
  custom: string;
  onCustomChange: (v: string) => void;
}) {
  return (
    <fieldset className="grid gap-2 rounded-lg border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">Przypomnienia</legend>
      <div className="grid grid-cols-2 gap-2">
        {REMINDER_OFFSETS.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={offsets.includes(o.value)}
              onCheckedChange={(c) => onOffsetsChange(c ? [...offsets, o.value] : offsets.filter((x) => x !== o.value))}
            />
            {o.label}
          </label>
        ))}
      </div>
      <label className="grid gap-1 text-sm">
        <span className="text-xs text-muted-foreground">Własna data i godzina (opcjonalnie)</span>
        <Input type="datetime-local" value={custom} onChange={(e) => onCustomChange(e.target.value)} />
      </label>
    </fieldset>
  );
}
