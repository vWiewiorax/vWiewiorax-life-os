import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { NoteEditor } from "@/components/materials/note-editor";

export default async function NotePage({ params }: PageProps<"/materialy/notatki/[id]">) {
  const { id } = await params;
  const { supabase } = await getProfile();
  const [{ data: note }, subjects] = await Promise.all([
    supabase.from("ai_notes").select("id,title,content,subject_id,material_id").eq("id", id).maybeSingle(),
    supabase.from("subjects").select("id,name").eq("archived", false).order("name"),
  ]);
  if (!note) notFound();
  return (
    <div>
      <Link href={note.material_id ? `/materialy/${note.material_id}` : "/materialy"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden">
        <ArrowLeft className="size-4" /> {note.material_id ? "Materiał" : "Materiały"}
      </Link>
      <NoteEditor key={note.id} note={note} subjects={subjects.data ?? []} />
    </div>
  );
}
