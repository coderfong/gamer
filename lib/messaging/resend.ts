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

export async function sendCampaignLaunchedEmail(args: {
  to: string;
  brandName: string;
  campaignName: string;
  publicUrl: string;
  qrDataUrl?: string | null;
}): Promise<SendResult> {
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="margin:0 0 16px 0;">Your campaign is live 🚀</h1>
      <p>Hi ${escapeHtml(args.brandName)},</p>
      <p><strong>${escapeHtml(args.campaignName)}</strong> is now accepting plays. Share this link:</p>
      <p style="margin: 16px 0;">
        <a href="${args.publicUrl}" style="color:#6d28d9;">${escapeHtml(args.publicUrl)}</a>
      </p>
      ${args.qrDataUrl ? `<p><img src="${args.qrDataUrl}" alt="Campaign QR code" width="180" height="180" /></p>` : ""}
      <p style="color:#666; font-size:13px;">Manage it anytime from your dashboard.</p>
    </div>
  `;
  return send({ to: args.to, subject: `“${args.campaignName}” is live!`, html });
}

export async function sendLowInventoryEmail(args: {
  to: string;
  brandName: string;
  campaignName: string;
  prizeName: string;
  remaining: number;
  total: number;
}): Promise<SendResult> {
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="margin:0 0 16px 0;">Low prize inventory ⚠️</h1>
      <p>Hi ${escapeHtml(args.brandName)},</p>
      <p>The prize <strong>${escapeHtml(args.prizeName)}</strong> in
      <strong>${escapeHtml(args.campaignName)}</strong> is running low:
      <strong>${args.remaining}</strong> of ${args.total} vouchers left.</p>
      <p style="color:#666; font-size:13px;">Upload more codes from the campaign editor to keep it running.</p>
    </div>
  `;
  return send({
    to: args.to,
    subject: `Low inventory: ${args.prizeName} (${args.remaining} left)`,
    html,
  });
}

export async function sendInvoiceRequestEmail(args: {
  to: string;
  brandName: string;
  brandEmail: string;
  campaignCount: number;
  notes?: string;
}): Promise<SendResult> {
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="margin:0 0 16px 0;">Invoice request</h1>
      <p><strong>${escapeHtml(args.brandName)}</strong> (${escapeHtml(args.brandEmail)}) requested an invoice.</p>
      <p>Campaign count: <strong>${args.campaignCount}</strong></p>
      ${args.notes ? `<p>Notes:<br/>${escapeHtml(args.notes).replace(/\n/g, "<br/>")}</p>` : ""}
    </div>
  `;
  return send({
    to: args.to,
    subject: `Invoice request from ${args.brandName}`,
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
