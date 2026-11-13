"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const urlB64ToUint8 = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<"loading" | "unsupported" | "denied" | "off" | "on">("loading");
  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })();
  }, []);
  if (!publicKey) return <p className="text-sm text-muted-foreground">Powiadomienia push wymagają kluczy VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY i VAPID_PRIVATE_KEY) - patrz README.</p>;
  const enable = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(publicKey) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error((await res.json()).error);
      setState("on");
      toast.success("Powiadomienia włączone na tym urządzeniu");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się włączyć powiadomień");
    }
  };
  const disable = async () => {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
  };
  if (state === "unsupported") return <p className="text-sm text-muted-foreground">Ta przeglądarka nie obsługuje powiadomień push. Na iPhonie dodaj aplikację do ekranu początkowego (iOS 16.4+).</p>;
  if (state === "denied") return <p className="text-sm text-muted-foreground">Powiadomienia są zablokowane w ustawieniach przeglądarki dla tej strony. Odblokuj je i odśwież.</p>;
  return state === "on" ? (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400"><BellRing className="size-4" /> Włączone na tym urządzeniu</span>
      <Button size="sm" variant="outline" onClick={disable}>Wyłącz</Button>
    </div>
  ) : (
    <Button size="sm" onClick={enable} disabled={state === "loading"}><BellRing /> Włącz powiadomienia na tym urządzeniu</Button>
  );
}
