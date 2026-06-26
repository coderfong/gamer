"use client";

import { useState } from "react";
import { generateClientKey, clearClientKey } from "@/app/(admin)/brand/[id]/signups/actions";

// Operator control to grant a client a read-only login to just this brand's
// dashboard. Generates a secret key; shares a one-click magic link.
export function ClientAccessPanel({
  brandId,
  publicSlug,
  accessKey,
  appUrl,
}: {
  brandId: string;
  publicSlug: string | null;
  accessKey: string | null;
  appUrl: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const base = appUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const magicLink = accessKey && publicSlug ? `${base}/api/portal/login?b=${encodeURIComponent(publicSlug)}&k=${encodeURIComponent(accessKey)}` : null;
  const loginUrl = `${base}/portal/login`;

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="ad-card p-5 space-y-3" style={{ maxWidth: 640 }}>
      <div>
        <h2 className="text-lg font-bold">Client access</h2>
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Give this client a read-only login to see just this brand&apos;s dashboard and captured emails.
        </p>
      </div>

      {!publicSlug ? (
        <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
          Publish the play hub first (open the studio and save) to enable client access.
        </p>
      ) : !accessKey ? (
        <form action={generateClientKey.bind(null, brandId)}>
          <button type="submit" className="ad-btn ad-btn-primary">Generate access key</button>
        </form>
      ) : (
        <div className="space-y-3">
          <Row label="One-click link (send to client)">
            <code className="block truncate text-xs" style={{ color: "var(--ad-muted)" }}>{magicLink}</code>
            <button type="button" className="ad-btn ad-btn-ghost shrink-0" onClick={() => copy(magicLink!, "link")}>
              {copied === "link" ? "Copied" : "Copy"}
            </button>
          </Row>
          <Row label="Or sign-in page + key">
            <code className="block truncate text-xs" style={{ color: "var(--ad-muted)" }}>{loginUrl} · {accessKey}</code>
            <button type="button" className="ad-btn ad-btn-ghost shrink-0" onClick={() => copy(accessKey, "key")}>
              {copied === "key" ? "Copied" : "Copy key"}
            </button>
          </Row>
          <div className="flex gap-2 pt-1">
            <form action={generateClientKey.bind(null, brandId)}>
              <button type="submit" className="ad-btn ad-btn-ghost">Regenerate</button>
            </form>
            <form action={clearClientKey.bind(null, brandId)}>
              <button type="submit" className="ad-btn ad-btn-ghost" style={{ color: "#b91c1c" }}>Revoke access</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--ad-faint)" }}>{label}</div>
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--ad-border)" }}>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
