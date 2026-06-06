"use client";
import { useEffect, useRef, useState } from "react";
import { computeFingerprint } from "@/lib/fraud/fingerprint";

export interface CaptureSubmit {
  name: string;
  email: string;
  phone: string;
  fingerprint: string;
  turnstileToken: string | null;
}

export interface PlayerCaptureProps {
  onSubmit: (form: CaptureSubmit) => Promise<void> | void;
  submitting?: boolean;
  error?: string | null;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (t: string) => void; "error-callback"?: () => void; theme?: string },
      ) => string;
      remove?: (id: string) => void;
    };
  }
}

export function PlayerCapture({ onSubmit, submitting, error }: PlayerCaptureProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [fp, setFp] = useState("");
  const [tsToken, setTsToken] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  useEffect(() => {
    setFp(computeFingerprint());
  }, []);

  // Load Turnstile script + render widget once when sitekey is present.
  useEffect(() => {
    if (!siteKey) return;
    const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    function render() {
      if (!widgetRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: siteKey,
        callback: (token) => setTsToken(token),
        "error-callback": () => setTsToken(null),
      });
    }
    if (window.turnstile) {
      render();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (existing) {
      existing.addEventListener("load", render, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.addEventListener("load", render, { once: true });
    document.head.appendChild(s);
  }, [siteKey]);

  const captchaRequired = !!siteKey;
  const canSubmit = !submitting && (!captchaRequired || !!tsToken);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({ ...form, fingerprint: fp, turnstileToken: tsToken });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-semibold mb-1 text-white/90">Name</label>
        <input
          className="w-full rounded-xl border-2 border-white/20 bg-black/25 text-white placeholder-white/40 px-3 py-2.5 outline-none focus:border-[var(--brand-color)]"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Your name"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 text-white/90">Email</label>
        <input
          className="w-full rounded-xl border-2 border-white/20 bg-black/25 text-white placeholder-white/40 px-3 py-2.5 outline-none focus:border-[var(--brand-color)]"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 text-white/90">Phone (optional)</label>
        <input
          className="w-full rounded-xl border-2 border-white/20 bg-black/25 text-white placeholder-white/40 px-3 py-2.5 outline-none focus:border-[var(--brand-color)]"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+1 555 ..."
        />
      </div>
      {captchaRequired ? <div ref={widgetRef} className="flex justify-center" /> : null}
      {error ? <p className="text-red-300 text-sm font-semibold">{error}</p> : null}
      <button type="submit" className="btn-arcade w-full" disabled={!canSubmit}>
        {submitting ? "Starting…" : "PLAY"}
      </button>
    </form>
  );
}
