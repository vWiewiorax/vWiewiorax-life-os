"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/server/actions/auth";

const schema = z.object({
  display_name: z.string().optional(),
  email: z.email("Podaj poprawny e-mail"),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
});

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(params.get("blad") === "link" ? "Link wygasł lub jest nieprawidłowy." : null);
  const [info, setInfo] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", display_name: "" } });

  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      setError(null);
      if (mode === "register" && !values.display_name?.trim()) {
        form.setError("display_name", { message: "Podaj imię" });
        return;
      }
      const res =
        mode === "login"
          ? await signIn({ email: values.email, password: values.password })
          : await signUp({ email: values.email, password: values.password, display_name: values.display_name ?? "" });
      if (!res.ok) return setError(res.error);
      if (mode === "register" && res.data && "needsConfirmation" in res.data && res.data.needsConfirmation) {
        setInfo("Sprawdź skrzynkę e-mail i kliknij link potwierdzający, aby dokończyć rejestrację.");
        return;
      }
      router.replace(params.get("next") || "/");
      router.refresh();
    }),
  );

  const err = form.formState.errors;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{mode === "login" ? "Zaloguj się" : "Załóż konto"}</CardTitle>
        <CardDescription>Life OS - Twój osobisty system do studiów, nauki i rozwoju.</CardDescription>
      </CardHeader>
      <CardContent>
        {info ? (
          <p className="rounded-lg bg-muted p-3 text-sm">{info}</p>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            {mode === "register" && (
              <div className="grid gap-1.5">
                <Label htmlFor="display_name">Imię</Label>
                <Input id="display_name" autoComplete="given-name" {...form.register("display_name")} />
                {err.display_name && <p className="text-xs text-destructive">{err.display_name.message}</p>}
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {err.email && <p className="text-xs text-destructive">{err.email.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Hasło</Label>
              <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} {...form.register("password")} />
              {err.password && <p className="text-xs text-destructive">{err.password.message}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending} className="w-full" size="lg">
              {pending ? "Chwileczkę..." : mode === "login" ? "Zaloguj się" : "Utwórz konto"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  Nie masz konta? <Link href="/rejestracja" className="text-primary hover:underline">Zarejestruj się</Link>
                </>
              ) : (
                <>
                  Masz już konto? <Link href="/login" className="text-primary hover:underline">Zaloguj się</Link>
                </>
              )}
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
