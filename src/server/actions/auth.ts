"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { zodError, type ActionResult } from "@/lib/validation";

const credentials = z.object({
  email: z.email("Podaj poprawny e-mail"),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
});

export async function signIn(input: z.infer<typeof credentials>): Promise<ActionResult> {
  const parsed = credentials.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: error.message === "Invalid login credentials" ? "Nieprawidłowy e-mail lub hasło." : error.message };
  return { ok: true };
}

const signUpSchema = credentials.extend({ display_name: z.string().trim().min(1, "Podaj imię").max(100) });

export async function signUp(input: z.infer<typeof signUpSchema>): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodError(parsed.error) };
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? process.env.APP_URL ?? "";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.display_name }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { needsConfirmation: !data.session } };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
