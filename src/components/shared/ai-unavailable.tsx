import { TriangleAlert } from "lucide-react";

export function AiUnavailable({ className }: { className?: string }) {
  return (
    <div className={`flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm ${className ?? ""}`}>
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div>
        <p className="font-medium">Funkcje AI są wyłączone</p>
        <p className="text-muted-foreground">
          Brakuje klucza <code className="font-mono">OPENAI_API_KEY</code> w zmiennych środowiskowych serwera. Instrukcja konfiguracji jest w README. Reszta aplikacji działa normalnie.
        </p>
      </div>
    </div>
  );
}
