import type { Metadata } from "next";
import { getProfile } from "@/lib/profile";
import { features } from "@/lib/env";
import { AiUnavailable } from "@/components/shared/ai-unavailable";
import { Chat, type ChatMessage } from "@/components/assistant/chat";
import { ConversationList } from "@/components/assistant/conversation-list";

export const metadata: Metadata = { title: "Asystent AI" };

export default async function AssistantPage({ searchParams }: PageProps<"/asystent">) {
  const sp = await searchParams;
  const cid = typeof sp.c === "string" && /^[0-9a-f-]{36}$/.test(sp.c) ? sp.c : null;
  const { supabase, profile } = await getProfile();
  const [conversations, conversation, messages] = await Promise.all([
    supabase.from("ai_conversations").select("id,title").order("updated_at", { ascending: false }).limit(50),
    cid ? supabase.from("ai_conversations").select("id,include_journal").eq("id", cid).maybeSingle() : Promise.resolve({ data: null }),
    cid ? supabase.from("ai_messages").select("id,role,content,pending_actions").eq("conversation_id", cid).in("role", ["user", "assistant"]).order("created_at") : Promise.resolve({ data: [] }),
  ]);
  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
      <aside className="hidden md:block"><ConversationList items={conversations.data ?? []} active={cid} /></aside>
      <div>
        {!features.ai ? (
          <AiUnavailable />
        ) : (
          <Chat
            key={cid ?? "new"}
            conversationId={conversation.data?.id ?? null}
            initial={(messages.data ?? []) as unknown as ChatMessage[]}
            journalAllowed={!!profile?.ai_journal_access}
            initialJournal={!!conversation.data?.include_journal}
          />
        )}
      </div>
    </div>
  );
}
