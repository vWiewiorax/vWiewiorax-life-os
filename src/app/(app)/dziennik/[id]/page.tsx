import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { features } from "@/lib/env";
import { todayKey } from "@/lib/dates";
import { JournalEditor } from "@/components/journal/journal-editor";

export default async function JournalEntryPage({ params }: PageProps<"/dziennik/[id]">) {
  const { id } = await params;
  const { supabase, tz } = await getProfile();
  let entry;
  if (id === "nowy") {
    entry = { entry_date: todayKey(tz), title: null, mood: null, content: "", answers: {}, gratitude: null, tags: [], ai_reflection: null };
  } else {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    const { data } = await supabase.from("journal_entries").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    entry = { ...data, answers: (data.answers ?? {}) as Record<string, string> };
  }
  return (
    <div>
      <Link href="/dziennik" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dziennik
      </Link>
      <JournalEditor key={id} entry={entry} aiEnabled={features.ai} />
    </div>
  );
}
