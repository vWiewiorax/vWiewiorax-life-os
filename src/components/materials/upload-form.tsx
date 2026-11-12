"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/shared/fields";
import { createClient } from "@/lib/supabase/client";

const ACCEPT = ".pdf,.pptx,.docx,.txt,.md,.mp3,.wav,.m4a,.ogg,.webm,.png,.jpg,.jpeg,.webp,audio/*,image/*";

export function UploadForm({ userId, subjects, defaultSubject }: { userId: string; subjects: { id: string; name: string }[]; defaultSubject?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const upload = async () => {
    const supabase = createClient();
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name}: plik większy niż 50 MB.`);
        continue;
      }
      setBusy(`Wysyłanie: ${file.name}`);
      const safe = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
      const path = `${userId}/${crypto.randomUUID()}-${safe}`;
      const { error } = await supabase.storage.from("materials").upload(path, file, { contentType: file.type || undefined });
      if (error) {
        toast.error(`${file.name}: ${error.message}`);
        continue;
      }
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_path: path,
          title: (files.length === 1 && title.trim()) || file.name.replace(/\.[^.]+$/, ""),
          subject_id: subject || null,
          mime_type: file.type,
          size_bytes: file.size,
          filename: file.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(`${file.name}: ${json.error}`);
        await supabase.storage.from("materials").remove([path]);
      } else toast.success(`Dodano ${file.name}. Trwa przetwarzanie...`);
    }
    setBusy(null);
    setFiles([]);
    setTitle("");
    if (input.current) input.current.value = "";
    router.refresh();
  };

  return (
    <div className="grid gap-4 rounded-2xl border p-5">
      <div
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors hover:bg-muted/40"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium">{files.length ? files.map((f) => f.name).join(", ") : "Przeciągnij pliki lub kliknij, aby wybrać"}</p>
        <p className="text-xs text-muted-foreground">PDF, PowerPoint (PPTX), Word (DOCX), TXT/MD, nagrania MP3/WAV/M4A (do 25 MB), zdjęcia notatek. Maks. 50 MB.</p>
        <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Tytuł (opcjonalnie)">
          <Input value={title} disabled={files.length > 1} onChange={(e) => setTitle(e.target.value)} placeholder={files.length > 1 ? "Użyję nazw plików" : "np. Wykład 3 - całki oznaczone"} />
        </Field>
        <Field label="Przedmiot">
          <NativeSelect value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Bez przedmiotu</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Button onClick={upload} disabled={!files.length || !!busy}>{busy ? "Wysyłanie..." : "Wyślij i przetwórz"}</Button>
      </div>
      {busy && <p className="text-xs text-muted-foreground">{busy}</p>}
    </div>
  );
}
