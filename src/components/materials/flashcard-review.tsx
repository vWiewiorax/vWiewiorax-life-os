"use client";

import { useState } from "react";
import { Check, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { reviewFlashcard, deleteFlashcard } from "@/server/actions/notes";
import { useAction } from "@/hooks/use-action";
import { Markdown } from "@/components/shared/markdown";

type Card = { id: string; front: string; back: string; box: number };

export function FlashcardReview({ cards }: { cards: Card[] }) {
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ known: 0, unknown: 0 });
  const { run } = useAction();
  const card = queue[0];
  const done = stats.known + stats.unknown;

  if (!card)
    return (
      <div className="grid justify-items-center gap-3 rounded-2xl border p-10 text-center">
        <p className="text-lg font-medium">Koniec powtórki</p>
        <p className="text-sm text-muted-foreground">Znane: {stats.known} · Do powtórki: {stats.unknown}. Fiszki wrócą zgodnie z systemem Leitnera.</p>
      </div>
    );

  const answer = (known: boolean) => {
    run(() => reviewFlashcard(card.id, known));
    setStats((s) => (known ? { ...s, known: s.known + 1 } : { ...s, unknown: s.unknown + 1 }));
    setFlipped(false);
    setQueue((q) => q.slice(1));
  };

  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Progress value={(done / (done + queue.length)) * 100} className="flex-1" />
        {done}/{done + queue.length}
      </div>
      <button
        onClick={() => setFlipped(!flipped)}
        className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-8 text-center shadow-sm transition hover:border-primary/40"
      >
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{flipped ? "Odpowiedź" : "Pytanie"} · pudełko {card.box}</span>
        <div className="text-lg">{flipped ? <Markdown>{card.back}</Markdown> : card.front}</div>
        {!flipped && <span className="text-xs text-muted-foreground">Kliknij, aby odwrócić</span>}
      </button>
      <div className="flex justify-center gap-2">
        {flipped ? (
          <>
            <Button variant="outline" onClick={() => answer(false)}><X /> Nie wiedziałem</Button>
            <Button onClick={() => answer(true)}><Check /> Wiedziałem</Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setFlipped(true)}><RotateCcw /> Pokaż odpowiedź</Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Usuń fiszkę"
          onClick={() => {
            run(() => deleteFlashcard(card.id));
            setQueue((q) => q.slice(1));
          }}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
