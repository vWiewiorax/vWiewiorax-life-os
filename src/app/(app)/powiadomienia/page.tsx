import type { Metadata } from "next";
import { Bell } from "lucide-react";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { features } from "@/lib/env";
import { formatDateTime } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, SectionTitle } from "@/components/shared/page-header";
import { Pill } from "@/components/shared/badges";
import { CustomReminderForm, DeleteNotification, MarkRead, NotificationLink } from "@/components/settings/notification-list";

export const metadata: Metadata = { title: "Przypomnienia" };

const SOURCE: Record<string, string> = { academic_item: "uczelnia", task: "zadanie", habit: "nawyk", goal: "cel", time_block: "blok czasu", custom: "własne", postponed: "odkładane" };

export default async function NotificationsPage() {
  const { supabase, tz } = await getProfile();
  const [upcoming, sent] = await Promise.all([
    supabase.from("notifications").select("*").is("sent_at", null).order("scheduled_for").limit(100),
    supabase.from("notifications").select("*").not("sent_at", "is", null).order("sent_at", { ascending: false }).limit(50),
  ]);
  const unread = (sent.data ?? []).filter((n) => !n.read_at).length;
  const missing = [!features.cron && "cron (CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY)", !features.push && "push (VAPID)", !features.email && "e-mail (SMTP)"].filter(Boolean);
  return (
    <div>
      <PageHeader title="Przypomnienia" description="Wysyłane w tle przez serwer - działają także przy zamkniętej aplikacji." />
      <div className="grid gap-8">
        {missing.length > 0 && (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
            Brakuje konfiguracji: {missing.join(", ")}. Przypomnienia będą widoczne tutaj, ale nie wszystkie kanały zadziałają. Szczegóły w <Link className="text-primary hover:underline" href="/ustawienia">Ustawieniach</Link>.
          </p>
        )}
        <Card>
          <CardHeader><CardTitle className="text-base">Nowe przypomnienie</CardTitle></CardHeader>
          <CardContent><CustomReminderForm /></CardContent>
        </Card>
        <section>
          <SectionTitle action={unread > 0 ? <MarkRead /> : undefined}>Otrzymane{unread > 0 ? ` (${unread} nowe)` : ""}</SectionTitle>
          {!sent.data?.length ? (
            <EmptyState icon={Bell} title="Brak otrzymanych przypomnień" />
          ) : (
            <ul className="divide-y rounded-xl border">
              {sent.data.map((n) => (
                <li key={n.id} className="flex items-start gap-3 p-3">
                  {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="nowe" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium"><NotificationLink url={n.url}>{n.title}</NotificationLink></p>
                    {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                    <p className="text-xs text-muted-foreground">{formatDateTime(n.sent_at!, tz)}{n.last_error ? ` · częściowy błąd: ${n.last_error}` : ""}</p>
                  </div>
                  <DeleteNotification id={n.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <SectionTitle>Zaplanowane</SectionTitle>
          {!upcoming.data?.length ? (
            <p className="text-sm text-muted-foreground">Brak zaplanowanych przypomnień. Dodasz je przy egzaminach, zadaniach i blokach czasu albo powyżej.</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {upcoming.data.map((n) => (
                <li key={n.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium"><NotificationLink url={n.url}>{n.title}</NotificationLink></p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(n.scheduled_for, tz)} · {n.channels.join(", ")}
                      {n.attempts > 0 && n.last_error ? ` · próby: ${n.attempts}, błąd: ${n.last_error}` : ""}
                    </p>
                  </div>
                  {n.source_type && <Pill>{SOURCE[n.source_type] ?? n.source_type}</Pill>}
                  <DeleteNotification id={n.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
