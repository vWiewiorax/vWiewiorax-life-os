"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/shared/markdown";
import { AiUnavailable } from "@/components/shared/ai-unavailable";

type Source = { n: number; material_id: string; title: string };

export function AskMaterials({ aiEnabled, materialId, subjectId, placeholder }: { aiEnabled: boolean; materialId?: string; subjectId?: string; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<{ content: string; sources: Source[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (!aiEnabled) return <AiUnavailable />;
  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/materials/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, material_id: materialId ?? null, subject_id: subjectId ?? null }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAnswer(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  };
  const unique = answer ? [...new Map(answer.sources.map((s) => [s.material_id, s])).values()] : [];
  return (
    <div className="grid gap-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder ?? "Zadaj pytanie do swoich materiałów..."} />
        <Button type="submit" disabled={loading || !q.trim()}>
          <Search /> {loading ? "Szukam..." : "Zapytaj"}
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {answer && (
        <div className="rounded-xl border p-4">
          <Markdown>{answer.content}</Markdown>
          {unique.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Źródła:{" "}
              {unique.map((s, i) => (
                <span key={s.material_id}>
                  {i > 0 && ", "}
                  <Link className="text-primary hover:underline" href={`/materialy/${s.material_id}`}>{s.title}</Link>
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
