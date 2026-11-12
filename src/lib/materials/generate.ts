import "server-only";
import { z } from "zod";
import { BASE_PERSONA, chatJSON, chatText } from "@/lib/ai/openai";

const MAX_DIRECT = 120_000;

/** For very long materials, condense segments first (map step) so the final prompt fits comfortably. */
export async function sourceForPrompt(text: string) {
  if (text.length <= MAX_DIRECT) return text;
  const segments: string[] = [];
  for (let i = 0; i < text.length; i += 60_000) segments.push(text.slice(i, i + 60_000));
  const parts = await Promise.all(
    segments.map((s, i) =>
      chatText([
        { role: "system", content: `${BASE_PERSONA}\nStreszczasz fragment ${i + 1}/${segments.length} materiału do nauki. Zachowaj wszystkie definicje, wzory, daty, nazwiska, kluczowe fakty i strukturę rozdziałów. Pisz zwięźle w punktach.` },
        { role: "user", content: s },
      ]),
    ),
  );
  return parts.map((p, i) => `### Część ${i + 1}\n${p}`).join("\n\n");
}

const SOURCE_RULE = `Opierasz się przede wszystkim na podanym materiale. Jeśli dodajesz coś spoza materiału (wiedza ogólna), oznacz to wyraźnie dopiskiem "(wiedza ogólna, spoza materiału)".`;

export const NOTE_MODES = {
  lecture_notes: {
    title: "Notatki",
    prompt: `Stwórz uporządkowane notatki z tego materiału (np. transkrypcji wykładu albo dokumentu) w Markdown:
- "# " tytuł, potem logiczne sekcje "## ".
- W sekcjach najważniejsze informacje w punktach; kluczowe pojęcia pogrubione.
- Sekcja "## Definicje i pojęcia" - lista "**pojęcie** - definicja".
- Sekcja "## Daty, nazwiska i wzory" - jeśli występują (wzory w LaTeX: $...$).
- Sekcja "## Podsumowanie" - 4-6 zdań.
- Sekcja "## Pytania sprawdzające" - 6-10 pytań otwartych.
Pomijaj dygresje i powtórzenia z nagrania.`,
  },
  summary: {
    title: "Podsumowanie",
    prompt: `Przygotuj podsumowanie materiału w Markdown:
- "## Najważniejsze w skrócie" - 5-8 punktów.
- "## Rozdziały" - dla każdego rozdziału/części "### nazwa" i 2-5 zdań streszczenia.
- "## Kluczowe definicje" - lista.
- "## Co najpewniej będzie na egzaminie" - lista z krótkim uzasadnieniem.`,
  },
  exam_prep: {
    title: "Przygotowanie do egzaminu",
    prompt: `Przygotuj materiał do nauki przed egzaminem w Markdown:
- "## Zakres" - lista tematów od najważniejszych.
- "## Plan powtórki" - realistyczny plan na kilka sesji (czas w minutach na każdą).
- "## Ściąga" - najważniejsze fakty, definicje i wzory w zwięzłej formie.
- "## Typowe pytania egzaminacyjne" - 8-12 pytań z krótkimi modelowymi odpowiedziami.
- "## Częste błędy" - rzeczy, które łatwo pomylić.`,
  },
  explanation: {
    title: "Wyjaśnienie",
    prompt: `Wyjaśnij wskazany temat prostym językiem, krok po kroku, tak jakbyś tłumaczył go studentowi pierwszego roku. Użyj analogii i 1-2 przykładów. Na końcu dodaj "## Sprawdź się" z 3 pytaniami. Format: Markdown.`,
  },
} as const;
export type NoteMode = keyof typeof NOTE_MODES;

export async function generateNote(mode: NoteMode, source: string, topic?: string) {
  return chatText([
    { role: "system", content: `${BASE_PERSONA}\n${SOURCE_RULE}\n${NOTE_MODES[mode].prompt}` },
    { role: "user", content: `${topic ? `Temat / prośba: ${topic}\n\n` : ""}MATERIAŁ:\n${source}` },
  ]);
}

const cardsSchema = z.object({ cards: z.array(z.object({ front: z.string().min(1).max(500), back: z.string().min(1).max(2000) })).min(1).max(60) });
export async function generateFlashcards(source: string, count = 20, topic?: string) {
  const res = await chatJSON(
    [
      {
        role: "system",
        content: `${BASE_PERSONA}\n${SOURCE_RULE}\nStwórz ${count} fiszek do nauki z materiału. Zwróć JSON {"cards":[{"front":"pytanie lub pojęcie","back":"zwięzła odpowiedź"}]}. Jedna fiszka = jedna informacja. Obejmij najważniejsze definicje, fakty, wzory i zależności.`,
      },
      { role: "user", content: `${topic ? `Skup się na: ${topic}\n\n` : ""}MATERIAŁ:\n${source}` },
    ],
    cardsSchema,
  );
  return res.cards;
}

export const quizSchema = z.object({
  title: z.string().min(1).max(200),
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(2).max(6),
        correct_index: z.number().int().min(0),
        explanation: z.string().default(""),
      }),
    )
    .min(1)
    .max(40),
});
export type QuizQuestion = z.infer<typeof quizSchema>["questions"][number];

export async function generateQuiz(source: string, count = 10, topic?: string) {
  const res = await chatJSON(
    [
      {
        role: "system",
        content: `${BASE_PERSONA}\n${SOURCE_RULE}\nStwórz test wielokrotnego wyboru (${count} pytań, po 4 odpowiedzi, dokładnie jedna poprawna) sprawdzający zrozumienie materiału, nie tylko pamięć. Zwróć JSON {"title": string, "questions":[{"question": string, "options": [string,string,string,string], "correct_index": 0-3, "explanation": "dlaczego ta odpowiedź jest poprawna"}]}. Losowo rozmieszczaj poprawne odpowiedzi.`,
      },
      { role: "user", content: `${topic ? `Skup się na: ${topic}\n\n` : ""}MATERIAŁ:\n${source}` },
    ],
    quizSchema,
  );
  return { ...res, questions: res.questions.filter((q) => q.correct_index < q.options.length) };
}
