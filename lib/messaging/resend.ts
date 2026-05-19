import { Resend } from "resend";

// Resend wrapper. Falls back to console.log when RESEND_API_KEY is unset
// (same dev pattern as Turnstile / Upstash) so signup keeps working locally
// without an external account.

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM ?? "gamer <onboarding@resend.dev>";
const client = apiKey ? new Resend(apiKey) : null;

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

async function send(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  if (!client) {
    console.log(`[resend stub] to=${args.to} subject="${args.subject}"`);
    return { ok: true, skipped: true };
  }
  const { data, error } = await client.emails.send({
    from: fromAddress,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

export async function sendWelcomeEmail(args: {
  to: string;
  brandName: string;
}): Promise<SendResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="margin:0 0 16px 0;">Welcome to gamer 🎯</h1>
      <p>Hi there,</p>
      <p>Your account for <strong>${escapeHtml(args.brandName)}</strong> is ready.
      You can now create branded prize-game campaigns and share them with your audience.</p>
      <p style="margin: 24px 0;">
        <a href="${appUrl}/dashboard"
           style="display:inline-block; padding:10px 18px; background:#6d28d9; color:white; text-decoration:none; border-radius:8px;">
          Go to your dashboard
        </a>
      </p>
      <p style="color:#666; font-size:13px;">If you didn't sign up for gamer, you can safely ignore this email.</p>
    </div>
  `;
  return send({
    to: args.to,
    subject: `Welcome to gamer, ${args.brandName}!`,
    html,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]!);
}
