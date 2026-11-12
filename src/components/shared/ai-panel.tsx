"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/markdown";
import { AiUnavailable } from "@/components/shared/ai-unavailable";

/** A card with a button that POSTs to an AI endpoint and renders the Markdown answer. */
export function AiPanel({
  endpoint,
  body,
  title,
  description,
  buttonLabel,
  aiEnabled,
}: {
  endpoint: string;
  body?: unknown;
  title: string;
  description: string;
  buttonLabel: string;
  aiEnabled: boolean;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Błąd AI");
      setContent(json.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" /> {title}
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {aiEnabled && (
          <Button variant="outline" onClick={run} disabled={loading}>
            {loading ? "Analizuję..." : content ? "Przeanalizuj ponownie" : buttonLabel}
          </Button>
        )}
      </div>
      {!aiEnabled && <AiUnavailable className="mt-3" />}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {content && <Markdown className="mt-4">{content}</Markdown>}
    </div>
  );
}
