"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/shared/fields";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { deleteMaterial, updateMaterial } from "@/server/actions/notes";
import { useAction } from "@/hooks/use-action";

export function MaterialActions({ id, title, subjectId, subjects, canReprocess }: { id: string; title: string; subjectId: string | null; subjects: { id: string; name: string }[]; canReprocess: boolean }) {
  const router = useRouter();
  const [t, setT] = useState(title);
  const [s, setS] = useState(subjectId ?? "");
  const { pending, run } = useAction();
  const reprocess = async () => {
    const res = await fetch(`/api/materials/${id}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "reprocess" }) });
    if (!res.ok) toast.error((await res.json()).error);
    router.refresh();
  };
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div className="flex gap-2">
        <Input aria-label="Tytuł" value={t} onChange={(e) => setT(e.target.value)} />
        <NativeSelect aria-label="Przedmiot" className="w-auto" value={s} onChange={(e) => setS(e.target.value)}>
          <option value="">Bez przedmiotu</option>
          {subjects.map((x) => (
            <option key={x.id} value={x.id}>{x.name}</option>
          ))}
        </NativeSelect>
        <Button variant="outline" disabled={pending || (t === title && s === (subjectId ?? ""))} onClick={() => run(() => updateMaterial(id, { title: t, subject_id: s || null }), { success: "Zapisano" })}>
          Zapisz
        </Button>
      </div>
      <div className="flex gap-2">
        <a href={`/api/materials/${id}/file`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
          <Download /> Plik
        </a>
        {canReprocess && (
          <Button variant="outline" onClick={reprocess}>
            <RefreshCw /> Przetwórz ponownie
          </Button>
        )}
      </div>
      <ConfirmButton title="Usunąć materiał?" description="Plik, fiszki i testy z tego materiału zostaną usunięte. Notatki zostaną zachowane." action={() => deleteMaterial(id)} variant="outline" size="default" redirectTo="/materialy">
        <Trash2 /> Usuń
      </ConfirmButton>
    </div>
  );
}
