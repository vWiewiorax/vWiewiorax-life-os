"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveNote } from "@/server/actions/notes";
import { useAction } from "@/hooks/use-action";

export function NewNoteButton({ subjectId }: { subjectId?: string | null }) {
  const router = useRouter();
  const { pending, run } = useAction();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => run(() => saveNote({ title: "Nowa notatka", content: "", subject_id: subjectId ?? null }), { onSuccess: (d) => d && router.push(`/materialy/notatki/${d.id}`) })}
    >
      <Plus /> Notatka
    </Button>
  );
}
