import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { QuizRunner } from "@/components/materials/quiz-runner";
import { deleteQuiz } from "@/server/actions/notes";
import type { QuizQuestion } from "@/lib/materials/generate";

export default async function QuizPage({ params }: PageProps<"/materialy/quiz/[id]">) {
  const { id } = await params;
  const { supabase, tz } = await getProfile();
  const [{ data: quiz }, attempts] = await Promise.all([
    supabase.from("quizzes").select("*").eq("id", id).maybeSingle(),
    supabase.from("quiz_attempts").select("score,total,created_at").eq("quiz_id", id).order("created_at", { ascending: false }).limit(5),
  ]);
  if (!quiz) notFound();
  const remove = async () => {
    "use server";
    return deleteQuiz(id);
  };
  return (
    <div>
      <Link href={quiz.material_id ? `/materialy/${quiz.material_id}` : "/materialy"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Wróć
      </Link>
      <PageHeader
        title={quiz.title}
        description={attempts.data?.length ? `Ostatnie wyniki: ${attempts.data.map((a) => `${a.score}/${a.total} (${formatDate(a.created_at, tz, { day: "numeric", month: "short" })})`).join(", ")}` : "Pierwsze podejście"}
        actions={
          <ConfirmButton title="Usunąć test?" action={remove} variant="outline" size="default" redirectTo="/materialy">
            <Trash2 /> Usuń
          </ConfirmButton>
        }
      />
      <QuizRunner quizId={quiz.id} questions={quiz.questions as unknown as QuizQuestion[]} />
    </div>
  );
}
