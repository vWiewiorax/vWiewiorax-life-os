"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { postponeTasks } from "@/server/actions/tasks";
import { useAction } from "@/hooks/use-action";

export function PostponeAll({ ids }: { ids: string[] }) {
  const { pending, run } = useAction();
  if (!ids.length) return null;
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => postponeTasks(ids), { success: `Przeniesiono ${ids.length} na jutro` })}>
      <ArrowRight /> Nieukończone na jutro
    </Button>
  );
}
