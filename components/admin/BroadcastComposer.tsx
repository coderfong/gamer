"use client";

import { useState } from "react";
import { EmptyState } from "@/components/admin/EmptyState";

interface CampaignOption {
  id: string;
  name: string;
  status: string;
}

interface SendResult {
  recipients: number;
  sent: number;
  failed: number;
}

export function BroadcastComposer({
  consentedCount,
  campaigns,
}: {
  consentedCount: number;
  campaigns: CampaignOption[];
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  const canSend = !sending && consentedCount > 0 && subject.trim().length > 0 && message.trim().length > 0;

  async function send() {
    if (!canSend) return;
    if (!confirm(`Send this to ${consentedCount} marketing-consented customer(s)?`)) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          ...(campaignId ? { campaignId } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          json.error === "no_recipients"
            ? "No marketing-consented customers to send to yet."
            : json.message || json.error || `Server error ${res.status}`,
        );
        return;
      }
      setResult({ recipients: json.recipients, sent: json.sent, failed: json.failed });
      setSubject("");
      setMessage("");
      setCampaignId("");
    } catch (e) {
      setError(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  }

  if (consentedCount === 0) {
    return (
      <EmptyState
        icon="📣"
        title="No one to broadcast to yet"
        description="Broadcasts go only to customers who ticked the marketing-consent box. Once you have opted-in contacts, you can re-engage them here."
      />
    );
  }

  return (
    <div className="ad-card p-5 space-y-4" style={{ maxWidth: 640 }}>
      <div
        className="rounded-lg px-3 py-2 text-sm font-semibold"
        style={{ background: "var(--ad-accent-soft)", color: "var(--ad-accent-ink)" }}
      >
        Sending to {consentedCount} marketing-consented customer{consentedCount === 1 ? "" : "s"}.
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          placeholder="We've got a new game for you 🎉"
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--ad-border)" }}
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={5000}
          rows={6}
          placeholder="Hi! Thanks for playing with us before. We just launched a new game with fresh prizes — give it a spin!"
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--ad-border)" }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--ad-faint)" }}>
          An unsubscribe link is added automatically.
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">Link a campaign (optional)</label>
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
          style={{ borderColor: "var(--ad-border)" }}
        >
          <option value="">No call-to-action button</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.status === "active" ? "" : `(${c.status})`}
            </option>
          ))}
        </select>
        <p className="text-xs mt-1" style={{ color: "var(--ad-faint)" }}>
          Adds a “Play now” button linking to the campaign.
        </p>
      </div>

      {error ? <p className="text-red-600 text-sm font-semibold">{error}</p> : null}
      {result ? (
        <div className="rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: "#ecfdf5", color: "#065f46" }}>
          Sent to {result.sent} of {result.recipients}{result.failed ? ` · ${result.failed} failed` : ""}.
        </div>
      ) : null}

      <button type="button" onClick={send} disabled={!canSend} className="ad-btn ad-btn-primary">
        {sending ? "Sending…" : `Send broadcast`}
      </button>
    </div>
  );
}
