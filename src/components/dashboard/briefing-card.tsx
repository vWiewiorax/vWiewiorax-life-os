"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function BriefingCard({ initial, aiEnabled }: { initial: string | null; aiEnabled: boolean }) {
  const [content, setContent] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (force: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Nie udało się wygenerować podsumowania.");
      setContent(json.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Generating the briefing on first visit of the day is a fetch to an external system.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!initial && aiEnabled) void load(false);
  }, [initial, aiEnabled, load]);

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" /> Podsumowanie dnia
        </span>
        {aiEnabled && (
          <Button variant="ghost" size="icon-xs" aria-label="Odśwież podsumowanie" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        )}
      </div>
      {!aiEnabled ? (
        <p className="text-sm text-muted-foreground">Podsumowanie AI pojawi się po skonfigurowaniu klucza OpenAI (OPENAI_API_KEY).</p>
      ) : loading && !content ? (
        <div className="grid gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-[15px] leading-relaxed">{content}</p>
      )}
    </div>
  );
}
