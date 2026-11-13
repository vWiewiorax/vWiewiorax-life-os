// Integration smoke test against local Supabase + running app (npm run start).
// Usage: node --env-file=.env.local scripts/smoke-test.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const app = process.env.APP_URL || "http://localhost:3000";
let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? ` - ${extra}` : ""}`);
  if (!ok) failures++;
};

async function userClient(email) {
  await admin.auth.admin.createUser({ email, password: "test-password-123", email_confirm: true });
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: "test-password-123" });
  if (error) throw error;
  return { c, id: data.user.id };
}

const stamp = Date.now();
const a = await userClient(`a${stamp}@test.local`);
const b = await userClient(`b${stamp}@test.local`);

// Profiles trigger
const { data: prof } = await a.c.from("profiles").select("id,timezone,day_start").single();
check("profile created by trigger", prof?.id === a.id, `${prof?.timezone} ${prof?.day_start}`);

// CRUD + RLS isolation
const { data: subj, error: se } = await a.c.from("subjects").insert({ name: "Matematyka" }).select().single();
check("A inserts subject", !se, se?.message);
const { data: bSees } = await b.c.from("subjects").select("id").eq("id", subj.id);
check("B cannot read A's subject (RLS)", bSees.length === 0);
const { data: bUpd } = await b.c.from("subjects").update({ name: "hack" }).eq("id", subj.id).select();
check("B cannot update A's subject (RLS)", bUpd.length === 0);
const { error: spoof } = await b.c.from("subjects").insert({ name: "x", user_id: a.id });
check("B cannot insert row as A", !!spoof);
const { error: crossFk } = await b.c.from("academic_items").insert({ subject_id: subj.id, kind: "exam", title: "x", due_at: new Date().toISOString() });
check("B cannot attach item to A's subject", !!crossFk, crossFk?.message);

const due = new Date(Date.now() + 4 * 86400000).toISOString();
const { error: ie } = await a.c.from("academic_items").insert({ subject_id: subj.id, kind: "exam", title: "Kolokwium", due_at: due, priority: "high" });
check("A inserts exam", !ie, ie?.message);
const { error: te } = await a.c.from("tasks").insert({ title: "Powtórka całek", scheduled_date: new Date().toISOString().slice(0, 10), postponed_count: 3 });
check("A inserts task", !te, te?.message);

// Storage isolation
const file = new Blob(["Całka oznaczona to granica sum Riemanna."], { type: "text/plain" });
const { error: upA } = await a.c.storage.from("materials").upload(`${a.id}/test.txt`, file);
check("A uploads to own folder", !upA, upA?.message);
const { error: upB } = await b.c.storage.from("materials").upload(`${a.id}/evil.txt`, file);
check("B cannot upload to A's folder", !!upB);
const { data: dlB } = await b.c.storage.from("materials").download(`${a.id}/test.txt`);
check("B cannot download A's file", !dlB);

// Notifications dispatcher
const { error: ne } = await a.c.from("notifications").insert({ title: "Test przypomnienia", scheduled_for: new Date(Date.now() - 1000).toISOString(), channels: ["in_app"] });
check("A schedules notification", !ne, ne?.message);
const unauth = await fetch(`${app}/api/cron/notifications`);
check("cron rejects missing secret", unauth.status === 401);
const cron = await fetch(`${app}/api/cron/notifications`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
const cronJson = await cron.json();
check("cron runs", cron.ok, JSON.stringify(cronJson));
const { data: sent } = await a.c.from("notifications").select("title,sent_at").not("sent_at", "is", null);
check("notification marked sent", sent.some((n) => n.title === "Test przypomnienia"));
check("postponed-task nudge queued", sent.some((n) => n.title.startsWith("Odkładasz")) || cronJson.postponedQueued > 0);

// Protected routes
for (const p of ["/", "/uczelnia", "/materialy", "/asystent", "/ustawienia"]) {
  const r = await fetch(`${app}${p}`, { redirect: "manual" });
  check(`${p} redirects anonymous user`, [302, 303, 307, 308].includes(r.status), String(r.status));
}
for (const p of ["/api/assistant", "/api/materials", "/api/briefing", "/api/materials/ask"]) {
  const r = await fetch(`${app}${p}`, { method: "POST", body: "{}", headers: { "Content-Type": "application/json" }, redirect: "manual" });
  check(`${p} rejects anonymous`, [401, 307].includes(r.status), String(r.status));
}
const login = await fetch(`${app}/login`);
check("/login renders", login.ok);

// Authenticated rendering + material pipeline (cookie in @supabase/ssr format)
const { data: sess } = await a.c.auth.getSession();
const ref = new URL(url).hostname.split(".")[0];
const encoded = "base64-" + Buffer.from(JSON.stringify(sess.session)).toString("base64url");
const chunks = encoded.match(/.{1,3180}/g);
const cookie = chunks.length === 1 ? `sb-${ref}-auth-token=${encoded}` : chunks.map((c, i) => `sb-${ref}-auth-token.${i}=${c}`).join("; ");
const authed = (path, init = {}) => fetch(`${app}${path}`, { ...init, redirect: "manual", headers: { ...(init.headers || {}), cookie } });

const reg = await authed("/api/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storage_path: `${a.id}/test.txt`, title: "Notatki z całek", subject_id: subj.id, mime_type: "text/plain", size_bytes: 40, filename: "test.txt" }) });
const regJson = await reg.json();
check("register material", reg.ok, JSON.stringify(regJson));
const { data: evilReg } = { data: await authed("/api/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storage_path: `${b.id}/x.txt`, title: "x", mime_type: "text/plain", size_bytes: 1, filename: "x.txt" }) }) };
check("reject foreign storage path", evilReg.status === 403);
let mat;
for (let i = 0; i < 20; i++) {
  ({ data: mat } = await a.c.from("study_materials").select("status,error,extracted_text").eq("id", regJson.id).single());
  if (mat.status !== "processing") break;
  await new Promise((r) => setTimeout(r, 500));
}
check("material processed", mat.status === "ready" && mat.extracted_text.includes("Riemanna"), `${mat.status} ${mat.error ?? ""}`);
const { count: chunkCount } = await a.c.from("material_chunks").select("id", { count: "exact", head: true }).eq("material_id", regJson.id);
check("material chunks stored", chunkCount > 0, String(chunkCount));

const { data: goal } = await a.c.from("goals").insert({ title: "Zdać sesję", category: "education" }).select("id").single();
const { data: quiz } = await a.c.from("quizzes").insert({ title: "Quiz", material_id: regJson.id, questions: [{ question: "2+2?", options: ["3", "4"], correct_index: 1, explanation: "" }] }).select("id").single();
const { data: note } = await a.c.from("ai_notes").insert({ title: "Notatka", content: "# Test", kind: "manual" }).select("id").single();
const { data: entry } = await a.c.from("journal_entries").insert({ content: "Dobry dzień" }).select("id").single();
await a.c.from("habits").insert({ title: "Czytanie" });
await a.c.from("flashcards").insert({ front: "Co to całka?", back: "Granica sum", material_id: regJson.id });
const pages = ["/", "/uczelnia", `/uczelnia/${subj.id}`, "/materialy", `/materialy/${regJson.id}`, `/materialy/notatki/${note.id}`, "/materialy/fiszki", `/materialy/quiz/${quiz.id}`, "/planer", "/planer?widok=tydzien", "/kalendarz", "/cele", `/cele/${goal.id}`, "/nawyki", "/dziennik", `/dziennik/${entry.id}`, "/dziennik/nowy", "/asystent", "/powiadomienia", "/ustawienia"];
for (const p of pages) {
  const r = await authed(p);
  const html = r.ok ? await r.text() : "";
  check(`render ${p}`, r.status === 200 && !html.includes("Application error"), String(r.status));
}
const fileRes = await authed(`/api/materials/${regJson.id}/file`);
check("signed file redirect", [302, 307].includes(fileRes.status), String(fileRes.status));
const brief = await authed("/api/briefing", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
const briefJson = await brief.json();
check("briefing without OPENAI_API_KEY returns explicit error", process.env.OPENAI_API_KEY ? brief.ok : !brief.ok && /OPENAI_API_KEY/.test(briefJson.error), briefJson.error);

await admin.auth.admin.deleteUser(a.id);
await admin.auth.admin.deleteUser(b.id);
await admin.storage.from("materials").remove([`${a.id}/test.txt`]);
console.log(failures ? `\n${failures} FAILED` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
