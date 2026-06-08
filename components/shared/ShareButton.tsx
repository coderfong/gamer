"use client";
import { useState } from "react";

export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
          try { await navigator.share({ url, title }); return; } catch {}
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="sticker-sm rounded-xl bg-[var(--paper)] text-[var(--ink)] px-4 py-2 text-sm font-bold hover:translate-y-[-1px] transition-transform"
    >
      {copied ? "Link copied!" : "Share"}
    </button>
  );
}
