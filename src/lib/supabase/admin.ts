import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** Service-role client. Bypasses RLS: only for background jobs (cron) that act across users. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Brak SUPABASE_SERVICE_ROLE_KEY w zmiennych środowiskowych.");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
