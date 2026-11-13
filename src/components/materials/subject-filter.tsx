"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/shared/fields";

export function NativeSelectLinks({ subjects, value }: { subjects: { id: string; name: string }[]; value: string }) {
  const router = useRouter();
  return (
    <NativeSelect className="w-auto" aria-label="Filtruj po przedmiocie" value={value} onChange={(e) => router.push(e.target.value ? `/materialy?przedmiot=${e.target.value}` : "/materialy")}>
      <option value="">Wszystkie przedmioty</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </NativeSelect>
  );
}
