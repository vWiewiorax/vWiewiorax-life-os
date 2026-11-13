import "server-only";
import OpenAI, { toFile } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI nie jest skonfigurowane: ustaw OPENAI_API_KEY w zmiennych środowiskowych (patrz README).");
  }
}

let client: OpenAI | null = null;

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new AiNotConfiguredError();
  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  return client;
}

export const models = {
  chat: () => process.env.OPENAI_MODEL || "gpt-5-mini",
  transcribe: () => process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1",
  embedding: () => process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
};

export const BASE_PERSONA = `Jesteś osobistym asystentem w aplikacji "Life OS" - systemie do organizacji studiów, nauki, planowania dnia i rozwoju osobistego.
Zawsze odpowiadasz po polsku. Piszesz konkretnie, rzeczowo i życzliwie, bez pustych frazesów i cytatów motywacyjnych.
Nie używasz emoji. Nie używasz długich myślników (— ani –), tylko zwykły "-".
Nie wymyślasz faktów o użytkowniku: opierasz się wyłącznie na przekazanym kontekście. Gdy czegoś nie wiesz, mówisz to wprost.`;

export async function chatText(messages: ChatCompletionMessageParam[]) {
  const res = await getOpenAI().chat.completions.create({ model: models.chat(), messages });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

/** Asks the model for a JSON object and validates it with `schema`. Retries once on invalid output. */
export async function chatJSON<T extends z.ZodType>(
  messages: ChatCompletionMessageParam[],
  schema: T,
): Promise<z.infer<T>> {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await getOpenAI().chat.completions.create({
      model: models.chat(),
      messages: attempt === 0 ? messages : [...messages, { role: "user", content: `Poprzednia odpowiedź była niepoprawna (${lastError}). Zwróć wyłącznie poprawny obiekt JSON.` }],
      response_format: { type: "json_object" },
    });
    const raw = res.choices[0]?.message?.content ?? "";
    try {
      const parsed = schema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues[0]?.message ?? "zły format";
    } catch {
      lastError = "to nie był JSON";
    }
  }
  throw new Error(`Model zwrócił niepoprawne dane: ${lastError}`);
}

export async function transcribeAudio(data: ArrayBuffer, filename: string, mime: string) {
  const file = await toFile(Buffer.from(data), filename, { type: mime });
  const res = await getOpenAI().audio.transcriptions.create({
    file,
    model: models.transcribe(),
    language: "pl",
  });
  return res.text;
}

export async function describeImage(dataUrl: string) {
  const res = await getOpenAI().chat.completions.create({
    model: models.chat(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Przepisz dokładnie cały tekst z tego zdjęcia notatek (także odręcznych). Zachowaj strukturę: nagłówki, listy, wzory (zapisz je w LaTeX lub czytelnym tekście). Jeśli są rysunki lub schematy, opisz je krótko w nawiasach kwadratowych. Zwróć tylko treść notatek.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

export async function embed(texts: string[]) {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 64) {
    const res = await getOpenAI().embeddings.create({ model: models.embedding(), input: texts.slice(i, i + 64) });
    out.push(...res.data.map((d) => d.embedding));
  }
  return out;
}

/** Maps OpenAI/SDK errors to a short Polish message for the UI. */
export function aiErrorMessage(e: unknown) {
  if (e instanceof AiNotConfiguredError) return e.message;
  if (e instanceof OpenAI.APIError) {
    if (e.status === 401) return "Nieprawidłowy klucz OPENAI_API_KEY.";
    if (e.status === 429) return "Przekroczony limit lub brak środków na koncie OpenAI. Spróbuj później.";
    if (e.status === 413) return "Plik jest za duży dla API OpenAI.";
    return `Błąd OpenAI (${e.status ?? "?"}): ${e.message}`;
  }
  return e instanceof Error ? e.message : "Nieznany błąd AI.";
}
