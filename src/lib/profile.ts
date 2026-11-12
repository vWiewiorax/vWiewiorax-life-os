import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";
import { DEFAULT_TZ } from "@/lib/dates";

export const getProfile = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return {
    user,
    supabase,
    profile: data,
    tz: data?.timezone || DEFAULT_TZ,
    name: data?.display_name || user.email?.split("@")[0] || "",
  };
});
