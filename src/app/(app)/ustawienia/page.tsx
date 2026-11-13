import type { Metadata } from "next";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { features } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { PushToggle } from "@/components/settings/push-toggle";

export const metadata: Metadata = { title: "Ustawienia" };

const SERVICES = [
  { key: "ai", label: "OpenAI (AI, transkrypcja, notatki)", env: "OPENAI_API_KEY" },
  { key: "push", label: "Powiadomienia push", env: "NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY" },
  { key: "email", label: "E-mail (SMTP)", env: "SMTP_HOST, SMTP_FROM, SMTP_USER, SMTP_PASSWORD" },
  { key: "cron", label: "Przypomnienia w tle (cron)", env: "CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY" },
] as const;

export default async function SettingsPage() {
  const { profile, user, name } = await getProfile();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Ustawienia" description={user.email ?? undefined} />
      <div className="grid gap-6">
        <Card>
          <CardContent>
            <ProfileForm
              emailConfigured={features.email}
              initial={{
                display_name: profile?.display_name ?? name,
                timezone: profile?.timezone ?? "Europe/Warsaw",
                notification_email: profile?.notification_email ?? user.email ?? "",
                email_notifications: profile?.email_notifications ?? false,
                push_notifications: profile?.push_notifications ?? true,
                default_reminder_offsets: profile?.default_reminder_offsets ?? [1440],
                ai_journal_access: profile?.ai_journal_access ?? false,
                ai_context_enabled: profile?.ai_context_enabled ?? true,
                day_start: profile?.day_start?.slice(0, 5) ?? "07:00",
                day_end: profile?.day_end?.slice(0, 5) ?? "23:00",
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Powiadomienia na tym urządzeniu</CardTitle></CardHeader>
          <CardContent><PushToggle publicKey={features.push ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY! : null} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Integracje serwera</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {SERVICES.map((s) => (
              <div key={s.key} className="flex items-start gap-2 text-sm">
                {features[s.key] ? <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" /> : <CircleAlert className="mt-0.5 size-4 text-amber-600" />}
                <div>
                  <p>{s.label}: {features[s.key] ? "skonfigurowane" : "brak konfiguracji"}</p>
                  {!features[s.key] && <p className="text-xs text-muted-foreground">Ustaw zmienne: {s.env}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
