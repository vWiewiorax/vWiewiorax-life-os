import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/supabase/server";
import { detectKind } from "@/lib/materials/extract";
import { processMaterial } from "@/lib/materials/process";

export const maxDuration = 300;

const input = z.object({
  storage_path: z.string().min(1),
  title: z.string().trim().min(1).max(300),
  subject_id: z.uuid().nullable().optional(),
  mime_type: z.string().max(200).default(""),
  size_bytes: z.number().int().nonnegative(),
  filename: z.string().max(500),
});

/** Registers an uploaded file (already in Storage under <user_id>/...) and processes it in the background. */
export async function POST(request: Request) {
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Niepoprawne dane." }, { status: 400 });
  const { supabase, user } = auth;
  const v = parsed.data;
  if (!v.storage_path.startsWith(`${user.id}/`)) return NextResponse.json({ error: "Niedozwolona ścieżka pliku." }, { status: 403 });
  const kind = detectKind(v.filename, v.mime_type);
  if (kind === "other") return NextResponse.json({ error: "Nieobsługiwany format. Obsługiwane: PDF, PPTX, DOCX, TXT, MD, MP3, WAV, M4A, obrazy." }, { status: 400 });

  const { data, error } = await supabase
    .from("study_materials")
    .insert({ title: v.title, subject_id: v.subject_id ?? null, kind, storage_path: v.storage_path, mime_type: v.mime_type, size_bytes: v.size_bytes, status: "processing" })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  after(() => processMaterial(data.id, user.id));
  return NextResponse.json({ id: data.id });
}
