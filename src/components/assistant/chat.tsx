"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Markdown } from "@/components/shared/markdown";
import { cn } from "@/lib/utils";

type Action = { id: string; name: string; label: string; args: Record<string, unknown>; status: "pending" | "done" | "rejected" | "error"; error?: string };
export type ChatMessage = { id: string; role: string; content: string; pending_actions: Action[] | null };

const SUGGESTIONS = [
  "Co powinienem dzisiaj zrobić?",
  "Kiedy mam najbliższe zaliczenie?",
  "Z czego powinienem się dzisiaj pouczyć?",
  "Zaplanuj mi cały przyszły tydzień.",
  "Podsumuj moje ostatnie postępy.",
  "Pomóż mi przemyśleć, w jakim kierunku chcę rozwijać swoją karierę.",
];

const ARG_LABELS: Record<string, string> = { title: "Tytuł", date: "Data", scheduled_date: "Dzień", due_at: "Termin", scheduled_for: "Kiedy", start_time: "Od", end_time: "Do", priority: "Priorytet", estimated_minutes: "Minuty", kind: "Rodzaj", category: "Kategoria", progress: "Postęp", location: "Miejsce", target_date: "Termin" };

function ActionCard({ messageId, action, onChange }: { messageId: string; action: Action; onChange: (a: Action) => void }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const decide = async (decision: "confirm" | "reject") => {
    setBusy(true);
    try {
      const res = await fetch("/api/assistant/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message_id: messageId, action_id: action.id, decision }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onChange(json.action);
      if (json.action.status === "done") {
        toast.success(`${action.label}: wykonano`);
        router.refresh();
      } else if (json.action.status === "error") toast.error(json.action.error);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBusy(false);
    }
  };
  const fields = Object.entries(action.args).filter(([k, v]) => ARG_LABELS[k] && v !== undefined && v !== null && v !== "");
  const content = (action.args.content as string | undefined) ?? (action.args.description as string | undefined);
  const milestones = action.args.milestones as { title: string; due_date?: string }[] | undefined;
  return (
    <div className="grid gap-2 rounded-xl border bg-background p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{action.label}</span>
        {action.status !== "pending" && (
          <span className={cn("text-xs", action.status === "done" ? "text-emerald-600" : action.status === "error" ? "text-destructive" : "text-muted-foreground")}>
            {action.status === "done" ? "wykonano" : action.status === "rejected" ? "odrzucono" : `błąd: ${action.error}`}
          </span>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        {fields.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{ARG_LABELS[k]}</dt>
            <dd>{String(v).replace("T", " ")}</dd>
          </div>
        ))}
      </dl>
      {milestones && <ul className="list-disc pl-5 text-xs">{milestones.map((m) => <li key={m.title}>{m.title}{m.due_date ? ` (${m.due_date})` : ""}</li>)}</ul>}
      {content && <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Treść</summary><div className="mt-2 max-h-60 overflow-auto"><Markdown>{content}</Markdown></div></details>}
      {action.status === "pending" && (
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => decide("confirm")}><Check /> Potwierdź</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => decide("reject")}><X /> Odrzuć</Button>
        </div>
      )}
    </div>
  );
}

export function Chat({ conversationId, initial, journalAllowed, initialJournal }: { conversationId: string | null; initial: ChatMessage[]; journalAllowed: boolean; initialJournal: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [journal, setJournal] = useState(initialJournal && journalAllowed);
  const [cid, setCid] = useState(conversationId);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages.length, loading]);

  const send = async (msg: string) => {
    if (!msg.trim() || loading) return;
    setText("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: msg, pending_actions: null }]);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: cid, message: msg, include_journal: journal }) });
      const json = await res.json();
      if (json.conversation_id && json.conversation_id !== cid) {
        setCid(json.conversation_id);
        window.history.replaceState(null, "", `/asystent?c=${json.conversation_id}`);
      }
      if (!res.ok) throw new Error(json.error);
      setMessages((m) => [...m, json.message]);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-96 flex-col">
      <div className="flex-1 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="grid h-full content-center justify-items-center gap-4 text-center">
            <p className="text-lg font-medium">W czym mogę pomóc?</p>
            <div className="flex max-w-2xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-4 pb-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("grid gap-2", m.role === "user" && "justify-items-end")}>
                <div className={cn("max-w-[90%] rounded-2xl px-4 py-2.5 text-sm", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60")}>
                  {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdown>{m.content}</Markdown>}
                </div>
                {m.pending_actions?.map((a) => (
                  <div key={a.id} className="w-full max-w-md">
                    <ActionCard messageId={m.id} action={a} onChange={(na) => setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, pending_actions: x.pending_actions!.map((y) => (y.id === na.id ? na : y)) } : x)))} />
                  </div>
                ))}
              </div>
            ))}
            {loading && <div className="w-fit animate-pulse rounded-2xl bg-muted/60 px-4 py-2.5 text-sm text-muted-foreground">Myślę...</div>}
            <div ref={bottom} />
          </div>
        )}
      </div>
      <div className="mx-auto w-full max-w-3xl pt-3">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            placeholder="Napisz wiadomość... (Enter - wyślij, Shift+Enter - nowa linia)"
            className="resize-none pr-12"
          />
          <Button type="submit" size="icon-sm" aria-label="Wyślij" className="absolute right-2 bottom-2" disabled={loading || !text.trim()}><ArrowUp /></Button>
        </form>
        <label className={cn("mt-2 flex items-center gap-2 text-xs text-muted-foreground", !journalAllowed && "opacity-60")} title={journalAllowed ? undefined : "Włącz dostęp do dziennika w Ustawieniach"}>
          <Switch checked={journal} disabled={!journalAllowed} onCheckedChange={setJournal} />
          <Lock className="size-3" /> Uwzględnij dziennik w tej rozmowie{!journalAllowed && " (wyłączone w Ustawieniach)"}
        </label>
      </div>
    </div>
  );
}
