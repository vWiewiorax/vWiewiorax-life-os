import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-[50vh] place-content-center justify-items-center gap-3 text-center">
      <SearchX className="size-8 text-muted-foreground" />
      <h1 className="text-lg font-semibold">Nie znaleziono</h1>
      <p className="max-w-md text-sm text-muted-foreground">Ten element nie istnieje albo został usunięty.</p>
      <Link href="/" className={buttonVariants()}>Wróć do pulpitu</Link>
    </div>
  );
}
