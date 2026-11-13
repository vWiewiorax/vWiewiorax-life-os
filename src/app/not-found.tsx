import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-content-center justify-items-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Strona nie istnieje</h1>
      <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">Wróć do Life OS</Link>
    </main>
  );
}
