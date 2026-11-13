"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/validation";

/** Runs a server action in a transition and shows a toast on error (and optionally on success). */
export function useAction() {
  const [pending, start] = useTransition();
  const run = <T,>(fn: () => Promise<ActionResult<T>>, opts: { success?: string; onSuccess?: (data?: T) => void } = {}) =>
    start(async () => {
      try {
        const res = await fn();
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        if (opts.success) toast.success(opts.success);
        opts.onSuccess?.(res.data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Coś poszło nie tak.");
      }
    });
  return { pending, run };
}
