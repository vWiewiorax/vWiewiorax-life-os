"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveQuizAttempt } from "@/server/actions/notes";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

type Q = { question: string; options: string[]; correct_index: number; explanation: string };

export function QuizRunner({ quizId, questions }: { quizId: string; questions: Q[] }) {
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const { pending, run } = useAction();
  const submit = () => run(() => saveQuizAttempt(quizId, answers), { onSuccess: (d) => d && setResult(d) });
  return (
    <div className="grid gap-6">
      {result && (
        <div className="rounded-2xl border bg-primary/5 p-5">
          <p className="text-lg font-semibold">Wynik: {result.score}/{result.total} ({Math.round((result.score / result.total) * 100)}%)</p>
          <p className="text-sm text-muted-foreground">Przejrzyj wyjaśnienia przy pytaniach poniżej.</p>
        </div>
      )}
      {questions.map((q, qi) => (
        <div key={qi} className="grid gap-3 rounded-xl border p-4">
          <p className="font-medium">{qi + 1}. {q.question}</p>
          <div className="grid gap-2">
            {q.options.map((o, oi) => {
              const chosen = answers[qi] === oi;
              const correct = result && oi === q.correct_index;
              const wrong = result && chosen && oi !== q.correct_index;
              return (
                <button
                  key={oi}
                  disabled={!!result}
                  onClick={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    !result && chosen && "border-primary bg-primary/5",
                    !result && !chosen && "hover:bg-muted/50",
                    correct && "border-emerald-500 bg-emerald-500/10",
                    wrong && "border-red-500 bg-red-500/10",
                  )}
                >
                  {correct ? <CheckCircle2 className="size-4 text-emerald-600" /> : wrong ? <XCircle className="size-4 text-red-600" /> : <span className="size-4 rounded-full border" />}
                  {o}
                </button>
              );
            })}
          </div>
          {result && q.explanation && <p className="text-sm text-muted-foreground">{q.explanation}</p>}
        </div>
      ))}
      {result ? (
        <Button variant="outline" className="justify-self-start" onClick={() => { setResult(null); setAnswers(questions.map(() => -1)); }}>Rozwiąż ponownie</Button>
      ) : (
        <Button className="justify-self-start" disabled={pending || answers.includes(-1)} onClick={submit}>
          {answers.includes(-1) ? `Odpowiedz na wszystkie pytania (${answers.filter((a) => a >= 0).length}/${questions.length})` : "Sprawdź wynik"}
        </Button>
      )}
    </div>
  );
}
