import Link from "next/link";
import type { Metadata } from "next";
import { BookHeart, Lock, Plus } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { features } from "@/lib/env";
import { formatDate, todayKey } from "@/lib/dates";
import { MOODS } from "@/lib/journal";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/shared/page-header";
import { Pill } from "@/components/shared/badges";
import { AiPanel } from "@/components/shared/ai-panel";

export const metadata: Metadata = { title: "Dziennik" };

export default async function JournalPage() {
  const { supabase, tz } = await getProfile();
  const today = todayKey(tz);
  const { data: entries } = await supabase.from("journal_entries").select("id,entry_date,title,mood,content,tags").order("entry_date", { ascending: false }).limit(100);
  const todayEntry = entries?.find((e) => e.entry_date === today);
  return (
    <div>
      <PageHeader
        title="Dziennik"
        description={<span className="flex items-center gap-1.5"><Lock className="size-3.5" /> Prywatny. AI widzi wpisy tylko wtedy, gdy sam o to poprosisz.</span>}
        actions={<Link href={todayEntry ? `/dziennik/${todayEntry.id}` : "/dziennik/nowy"} className={buttonVariants()}><Plus /> {todayEntry ? "Dzisiejszy wpis" : "Nowy wpis"}</Link>}
      />
      <div className="grid gap-6">
        {entries && entries.length >= 3 && (
          <AiPanel endpoint="/api/ai/reflection" body={{ mode: "patterns", days: 30 }} title="Wzorce z ostatnich 30 dni" description="Powracające tematy, wartości i małe kroki. Wpisy zostaną wysłane do AI tylko teraz." buttonLabel="Przeanalizuj wpisy" aiEnabled={features.ai} />
        )}
        {!entries?.length ? (
          <EmptyState icon={BookHeart} title="Brak wpisów" description="Zacznij od kilku zdań o dzisiejszym dniu albo skorzystaj z pytań do refleksji." />
        ) : (
          <ul className="grid gap-2">
            {entries.map((e) => (
              <li key={e.id}>
                <Link href={`/dziennik/${e.id}`} className="grid gap-1 rounded-xl border p-4 transition-colors hover:bg-muted/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium capitalize">{formatDate(e.entry_date, tz, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                    {e.mood && <Pill>{MOODS[e.mood - 1]}</Pill>}
                    {e.tags.map((t) => <Pill key={t}>{t}</Pill>)}
                  </div>
                  {e.title && <p className="text-sm">{e.title}</p>}
                  {e.content && <p className="line-clamp-2 text-sm text-muted-foreground">{e.content}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
