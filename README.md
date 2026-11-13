# Life OS - osobisty asystent AI

Aplikacja Next.js + Supabase + OpenAI do zarządzania studiami, nauką, dniem, celami, nawykami i dziennikiem, z asystentem AI, który zna Twój kontekst i (po potwierdzeniu) wykonuje akcje w aplikacji.

## Moduły

| Sekcja | Ścieżka | Co robi |
| --- | --- | --- |
| Pulpit | `/` | Powitanie, podsumowanie dnia AI, zadania, terminy, postęp nauki, cele, szybkie notatki |
| Asystent AI | `/asystent` | Czat z kontekstem (przedmioty, terminy, zadania, plan, materiały, cele, nawyki, dziennik - tylko po włączeniu). Proponuje akcje: zadania, wydarzenia, terminy, notatki, cele, kamienie milowe, przypomnienia - każda wymaga kliknięcia "Potwierdź" |
| Uczelnia | `/uczelnia` | Przedmioty, prowadzący, zajęcia, egzaminy/kolokwia/projekty, filtry, postęp, porady AI co uczyć się najpierw |
| Materiały | `/materialy` | Upload PDF, MP3/WAV/M4A, PPTX, DOCX, zdjęcia notatek, TXT/MD. Transkrypcja, OCR, notatki AI, podsumowania, fiszki (powtórki), quizy, przygotowanie do egzaminu, "Zapytaj moje materiały" z cytowaniem źródeł |
| Planer | `/planer` | Zadania (priorytet, czas, kategoria, powtarzanie), przenoszenie, bloki czasu, widok dnia i tygodnia, plan dnia od AI |
| Kalendarz | `/kalendarz` | Widok miesiąca: zajęcia, terminy, zadania, wydarzenia |
| Cele | `/cele` | Kategorie, powód, termin, priorytet, kamienie milowe, postęp, refleksje, asystent celu AI |
| Nawyki | `/nawyki` | Dzienne/tygodniowe, serie, statystyki, notatki do wpisów, przypomnienia, coach AI |
| Dziennik | `/dziennik` | Prywatne wpisy, pytania refleksyjne, nastrój, wdzięczność, tagi, refleksja i analiza wzorców AI (tylko na żądanie) |
| Powiadomienia | `/powiadomienia` | Odebrane i zaplanowane przypomnienia, własne przypomnienia |
| Ustawienia | `/ustawienia` | Profil, strefa czasowa, godziny dnia, powiadomienia push/e-mail, prywatność AI, status integracji |

## Architektura

- `src/app/(app)` - strony chronione logowaniem (Server Components), `src/app/(auth)` - logowanie i rejestracja
- `src/app/api` - endpointy AI, upload materiałów, cron, push. Klucze API tylko po stronie serwera
- `src/server/actions` - Server Actions (CRUD) z walidacją Zod (`src/lib/validation.ts`)
- `src/lib/ai` - klient OpenAI, budowa kontekstu użytkownika, narzędzia asystenta
- `src/lib/materials` - ekstrakcja tekstu (PDF, PPTX, DOCX), transkrypcja, OCR, dzielenie na fragmenty, embeddingi
- `src/lib/notify` - wysyłka web push i e-mail (SMTP)
- `src/proxy.ts` - odświeżanie sesji Supabase i ochrona tras
- `supabase/migrations` - pełny schemat: tabele, RLS na każdej tabeli, prywatny bucket `materials`, pgvector, funkcja `match_material_chunks`
- `public/sw.js` - service worker dla powiadomień push

Bezpieczeństwo: każdy wiersz ma `user_id` i politykę RLS `auth.uid() = user_id`; klucze obce są złożone (`id, user_id`), więc nie da się podpiąć danych pod cudzy przedmiot; pliki leżą w `materials/<user_id>/...` z politykami Storage. Klucz `service_role` jest używany tylko przez cron i przetwarzanie w tle.

Uczciwość AI: bez `OPENAI_API_KEY` funkcje AI pokazują jasny komunikat o braku konfiguracji - aplikacja nigdy nie generuje udawanych odpowiedzi. Odpowiedzi z materiałów oznaczają, kiedy wychodzą poza Twoje pliki.

## Uruchomienie lokalne (Windows / PowerShell)

Wymagania: [Node.js 20+](https://nodejs.org), [Docker Desktop](https://www.docker.com/products/docker-desktop/) (dla lokalnego Supabase), Git.

```powershell
git clone https://github.com/vWiewiorax/vWiewiorax-life-os.git
cd vWiewiorax-life-os
npm install
npx supabase start
```

`npx supabase start` wypisze `API URL`, `anon key` i `service_role key`. Skopiuj plik środowiskowy i wklej te wartości:

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Wygeneruj klucze push i sekret crona (wklej wynik do `.env.local`):

```powershell
npx web-push generate-vapid-keys
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

Start aplikacji:

```powershell
npm run dev
```

Otwórz http://localhost:3000, załóż konto. Lokalne e-maile (potwierdzenia, przypomnienia) widać w Inbucket: http://127.0.0.1:54324 (ustaw `SMTP_HOST=127.0.0.1`, `SMTP_PORT=54325`).

## Konfiguracja usług zewnętrznych

### OpenAI (wymagane dla AI)
1. https://platform.openai.com/api-keys -> "Create new secret key"
2. Wpisz do `.env.local`: `OPENAI_API_KEY=sk-...`
3. Domyślne modele: `gpt-5-mini` (czat), `whisper-1` (transkrypcja), `text-embedding-3-small` (wyszukiwanie w materiałach). Zmiana przez `OPENAI_MODEL`, `OPENAI_TRANSCRIBE_MODEL`, `OPENAI_EMBEDDING_MODEL`.

Materiały wgrane bez klucza mają zapisany tekst, ale bez embeddingów - po dodaniu klucza kliknij "Przetwórz ponownie".

### Supabase w chmurze
1. https://supabase.com -> New project
2. Zastosuj schemat:
   ```powershell
   npx supabase login
   npx supabase link --project-ref TWOJ_REF
   npx supabase db push
   ```
3. Project Settings -> API: skopiuj URL, `anon` i `service_role` do zmiennych środowiskowych.
4. Authentication -> URL Configuration: `Site URL` = adres aplikacji, dodaj `https://TWOJA-APLIKACJA.vercel.app/auth/callback` do Redirect URLs.

### E-mail (opcjonalnie)
Dowolny SMTP, np. [Resend](https://resend.com): `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, `SMTP_PASSWORD=<API key>`, `SMTP_FROM` z zweryfikowanej domeny.

### Powiadomienia w tle (cron)
Przypomnienia są zapisywane w bazie i wysyłane przez `GET /api/cron/notifications` z nagłówkiem `Authorization: Bearer <CRON_SECRET>`. Endpoint wysyła zaległe push/e-mail, kolejkuje przypomnienia o nawykach i o zadaniach przekładanych 3+ razy, ponawia błędy (do 5 prób) i usuwa wygasłe subskrypcje push. Działa przy zamkniętej aplikacji.

- `vercel.json` ustawia Vercel Cron raz dziennie (limit planu Hobby).
- Aby przypomnienia przychodziły punktualnie, dodaj zewnętrzny cron co 5 minut, np. https://cron-job.org: URL `https://TWOJA-APLIKACJA.vercel.app/api/cron/notifications`, nagłówek `Authorization: Bearer <CRON_SECRET>`. Na planie Vercel Pro można zamiast tego zmienić harmonogram w `vercel.json` na `*/5 * * * *`.

Ręczny test lokalnie:
```powershell
curl.exe -H "Authorization: Bearer TWOJ_CRON_SECRET" http://localhost:3000/api/cron/notifications
```

### Wdrożenie na Vercel
1. https://vercel.com/new -> zaimportuj repozytorium
2. Environment Variables: wszystkie zmienne z `.env.example` (z wartościami produkcyjnymi, `APP_URL` = adres Vercel)
3. Deploy

## Testy

```powershell
npm run typecheck
npm run lint
npm run build
npm run start            # w drugim oknie:
npm run test:smoke
```

`test:smoke` tworzy dwóch tymczasowych użytkowników w lokalnym Supabase i sprawdza: RLS i izolację danych (także Storage), rejestrację i przetwarzanie materiału, renderowanie wszystkich stron po zalogowaniu, ochronę tras, cron powiadomień oraz jawny błąd AI bez klucza. Po teście usuwa dane.

Po zmianie schematu: `npm run db:reset` i `npm run db:types`.
