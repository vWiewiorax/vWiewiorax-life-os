import "server-only";
import JSZip from "jszip";
import { describeImage, transcribeAudio } from "@/lib/ai/openai";
import type { MaterialKind } from "@/lib/labels";

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export function detectKind(filename: string, mime: string): MaterialKind {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "webm", "mp4", "mpeg", "mpga", "flac"].includes(ext)) return "audio";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "heic"].includes(ext)) return "image";
  if (ext === "pptx" || mime.includes("presentationml")) return "presentation";
  if (["txt", "md", "markdown", "csv", "docx"].includes(ext) || mime.startsWith("text/") || mime.includes("wordprocessingml")) return "text";
  return "other";
}

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");

async function pptxText(buf: ArrayBuffer) {
  const zip = await JSZip.loadAsync(buf);
  const slides = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)![1]) - Number(b.match(/(\d+)\.xml$/)![1]));
  const out: string[] = [];
  for (const [i, f] of slides.entries()) {
    const xml = await zip.file(f)!.async("string");
    const paras = xml.split(/<\/a:p>/).map((p) => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1])).join("")).filter((p) => p.trim());
    const notesFile = zip.file(f.replace("slides/slide", "notesSlides/notesSlide"));
    let notes = "";
    if (notesFile) {
      const nx = await notesFile.async("string");
      notes = [...nx.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1])).join(" ").trim();
    }
    out.push(`## Slajd ${i + 1}\n${paras.join("\n")}${notes ? `\n\nNotatki prowadzącego: ${notes}` : ""}`);
  }
  return out.join("\n\n");
}

async function docxText(buf: ArrayBuffer) {
  const zip = await JSZip.loadAsync(buf);
  const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
  return xml
    .split(/<\/w:p>/)
    .map((p) => [...p.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => decodeXml(m[1])).join(""))
    .filter((p) => p.trim())
    .join("\n");
}

async function pdfText(buf: ArrayBuffer) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).map((t, i) => `[Strona ${i + 1}]\n${t.trim()}`).join("\n\n");
}

/** Extracts plain text from an uploaded file. Audio and images need OpenAI (transcription / vision). */
export async function extractText(buf: ArrayBuffer, filename: string, mime: string, kind: MaterialKind): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  switch (kind) {
    case "pdf": {
      const text = await pdfText(buf);
      if (text.replace(/\[Strona \d+\]/g, "").trim().length < 50)
        throw new Error("Ten PDF nie zawiera warstwy tekstowej (prawdopodobnie to skan). Wgraj zdjęcia stron jako obrazy, żeby AI je odczytało.");
      return text;
    }
    case "presentation":
      return pptxText(buf);
    case "audio":
      if (buf.byteLength > MAX_AUDIO_BYTES) throw new Error("Nagranie jest większe niż 25 MB (limit transkrypcji OpenAI). Podziel je na krótsze części lub zapisz w niższej jakości (np. MP3 64 kbps).");
      return transcribeAudio(buf, filename, mime || "audio/mpeg");
    case "image": {
      const dataUrl = `data:${mime || "image/jpeg"};base64,${Buffer.from(buf).toString("base64")}`;
      return describeImage(dataUrl);
    }
    case "text":
      if (ext === "docx") return docxText(buf);
      return new TextDecoder("utf-8").decode(buf);
    default:
      throw new Error("Nieobsługiwany format pliku. Obsługiwane: PDF, PPTX, DOCX, TXT, MD, MP3, WAV, M4A, obrazy.");
  }
}

/** Splits text into ~1500 character chunks on paragraph boundaries with a small overlap. */
export function chunkText(text: string, size = 1500, overlap = 200) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (p.length > size) {
      if (cur) chunks.push(cur);
      cur = "";
      for (let i = 0; i < p.length; i += size - overlap) chunks.push(p.slice(i, i + size));
      continue;
    }
    if ((cur + "\n\n" + p).length > size && cur) {
      chunks.push(cur);
      cur = cur.slice(-overlap) + "\n\n" + p;
    } else cur = cur ? cur + "\n\n" + p : p;
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}
