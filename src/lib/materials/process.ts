import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiErrorMessage, embed } from "@/lib/ai/openai";
import { features } from "@/lib/env";
import { chunkText, extractText } from "./extract";
import type { MaterialKind } from "@/lib/labels";

/**
 * Background processing of an uploaded material: extract text, chunk, embed.
 * Runs with the service role (after the response is sent), so every query is scoped by user_id explicitly.
 */
export async function processMaterial(materialId: string, userId: string) {
  const db = createAdminClient();
  const { data: m } = await db.from("study_materials").select("*").eq("id", materialId).eq("user_id", userId).single();
  if (!m || !m.storage_path) return;
  try {
    const { data: file, error } = await db.storage.from("materials").download(m.storage_path);
    if (error || !file) throw new Error("Nie udało się pobrać pliku z magazynu.");
    const buf = await file.arrayBuffer();
    const filename = m.storage_path.split("/").pop() ?? "plik";
    const text = (await extractText(buf, filename, m.mime_type ?? "", m.kind as MaterialKind)).trim();
    if (!text) throw new Error("Nie znaleziono tekstu w pliku.");

    await db.from("material_chunks").delete().eq("material_id", m.id).eq("user_id", userId);
    const chunks = chunkText(text);
    const vectors = features.ai ? await embed(chunks) : [];
    for (let i = 0; i < chunks.length; i += 100) {
      const rows = chunks.slice(i, i + 100).map((content, j) => ({
        user_id: userId,
        material_id: m.id,
        chunk_index: i + j,
        content,
        embedding: vectors[i + j] ? JSON.stringify(vectors[i + j]) : null,
      }));
      const { error: insErr } = await db.from("material_chunks").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }
    await db.from("study_materials").update({ extracted_text: text, status: "ready", error: null, processed_at: new Date().toISOString() }).eq("id", m.id);
  } catch (e) {
    const message = aiErrorMessage(e);
    await db.from("study_materials").update({ status: "error", error: message }).eq("id", m.id);
  }
}
