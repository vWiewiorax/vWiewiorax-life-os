import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { PageHeader } from "@/components/shared/page-header";
import { FlashcardReview } from "@/components/materials/flashcard-review";

export const metadata: Metadata = { title: "Fiszki" };

export default async function FlashcardsPage({ searchParams }: PageProps<"/materialy/fiszki">) {
  const sp = await searchParams;
  const { supabase } = await getProfile();
  const material = typeof sp.material === "string" ? sp.material : null;
  let q = supabase.from("flashcards").select("id,front,back,box").order("due_at").limit(50);
  q = material ? q.eq("material_id", material) : q.lte("due_at", new Date().toISOString());
  const { data } = await q;
  return (
    <div>
      <Link href={material ? `/materialy/${material}` : "/materialy"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Wróć
      </Link>
      <PageHeader title="Powtórka fiszek" description={material ? "Wszystkie fiszki z materiału." : "Fiszki zaplanowane na dziś (system Leitnera)."} />
      {data?.length ? <FlashcardReview cards={data} /> : <p className="text-sm text-muted-foreground">Nie masz fiszek do powtórki. Wygeneruj je na stronie materiału.</p>}
    </div>
  );
}
