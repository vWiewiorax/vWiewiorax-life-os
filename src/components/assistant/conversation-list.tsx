"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { deleteConversation } from "@/server/actions/assistant";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";

export function ConversationList({ items, active }: { items: { id: string; title: string }[]; active: string | null }) {
  const { run } = useAction();
  const router = useRouter();
  return (
    <nav className="grid content-start gap-1">
      <Link href="/asystent" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mb-2 justify-start")}><Plus /> Nowa rozmowa</Link>
      {items.map((c) => (
        <div key={c.id} className={cn("group flex items-center rounded-lg text-sm hover:bg-muted/60", active === c.id && "bg-muted")}>
          <Link href={`/asystent?c=${c.id}`} className="flex-1 truncate px-2 py-1.5">{c.title}</Link>
          <button aria-label="Usuń rozmowę" className="px-2 text-muted-foreground opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => run(() => deleteConversation(c.id), { onSuccess: () => active === c.id && router.push("/asystent") })}>
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </nav>
  );
}
