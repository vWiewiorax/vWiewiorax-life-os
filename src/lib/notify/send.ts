import "server-only";
import * as webpush from "web-push";
import nodemailer from "nodemailer";
import { features } from "@/lib/env";

let vapidSet = false;
function ensureVapid() {
  if (vapidSet) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  vapidSet = true;
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };

/** Returns "gone" when the subscription is expired and should be deleted. */
export async function sendPush(sub: PushSub, payload: { title: string; body?: string | null; url?: string | null }) {
  if (!features.push) throw new Error("Push nie jest skonfigurowany (VAPID).");
  ensureVapid();
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3600 });
    return "ok" as const;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone" as const;
    throw e;
  }
}

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;
export async function sendEmail(to: string, subject: string, text: string, url?: string | null) {
  if (!features.email) throw new Error("E-mail nie jest skonfigurowany (SMTP).");
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  const link = url ? `${process.env.APP_URL || ""}${url}` : process.env.APP_URL;
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Life OS: ${subject}`,
    text: `${subject}\n\n${text}${link ? `\n\nOtwórz: ${link}` : ""}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px"><h2 style="font-size:18px">${escapeHtml(subject)}</h2><p style="color:#444">${escapeHtml(text)}</p>${link ? `<p><a href="${link}" style="color:#5b5bd6">Otwórz w Life OS</a></p>` : ""}</div>`,
  });
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
