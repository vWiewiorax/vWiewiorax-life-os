import { MobileHeader, Sidebar } from "@/components/app/sidebar";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, user } = await requireUser();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .not("sent_at", "is", null)
    .is("read_at", null);

  return (
    <div className="flex min-h-dvh">
      <Sidebar email={user.email ?? ""} unread={count ?? 0} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader email={user.email ?? ""} unread={count ?? 0} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
