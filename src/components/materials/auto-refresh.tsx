"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refreshes server data periodically while something is processing in the background. */
export function AutoRefresh({ active, interval = 4000 }: { active: boolean; interval?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), interval);
    return () => clearInterval(t);
  }, [active, interval, router]);
  return null;
}
