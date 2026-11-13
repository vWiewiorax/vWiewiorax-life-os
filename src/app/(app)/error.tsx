"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="grid min-h-[50vh] place-content-center justify-items-center gap-3 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <h1 className="text-lg font-semibold">Coś poszło nie tak</h1>
      <p className="max-w-md text-sm text-muted-foreground">Nie udało się wczytać tej strony. Twoje dane są bezpieczne - spróbuj ponownie za chwilę.</p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">Kod błędu: {error.digest}</p>}
      <Button onClick={reset}><RotateCcw /> Spróbuj ponownie</Button>
    </div>
  );
}
