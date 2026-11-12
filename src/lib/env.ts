import "server-only";

export const features = {
  ai: Boolean(process.env.OPENAI_API_KEY),
  push: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  email: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
  cron: Boolean(process.env.CRON_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY),
};

export const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";
