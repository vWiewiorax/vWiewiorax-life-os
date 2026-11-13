import { NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/supabase/server";

export async function GET(_req: Request, ctx: RouteContext<"/api/materials/[id]/file">) {
  const { id } = await ctx.params;
  const auth = await getUserOrNull();
  if (!auth) return NextResponse.json({ error: "Nie zalogowano." }, { status: 401 });
  const { data: m } = await auth.supabase.from("study_materials").select("storage_path").eq("id", id).maybeSingle();
  if (!m?.storage_path) return NextResponse.json({ error: "Nie znaleziono pliku." }, { status: 404 });
  const { data, error } = await auth.supabase.storage.from("materials").createSignedUrl(m.storage_path, 300);
  if (error || !data) return NextResponse.json({ error: "Nie udało się udostępnić pliku." }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
