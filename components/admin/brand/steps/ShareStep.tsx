"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { BrandStudioConfig } from "@/lib/types/studio";

interface Props {
  publicSlug: string | null;
  saved: boolean;
  onSave: () => void;
  saving: boolean;
  config: BrandStudioConfig;
  onImport: (raw: unknown) => void;
}

export function ShareStep({ publicSlug, saved, onSave, saving, config, onImport }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${publicSlug ?? "brand"}-studio.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function importJson(file: File) {
    setImportError(null);
    try {
      const parsed = JSON.parse(await file.text());
      onImport(parsed);
    } catch {
      setImportError("That file isn't valid studio JSON.");
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");
  const hubUrl = publicSlug ? `${appUrl}/b/${publicSlug}` : "";

  useEffect(() => {
    if (!hubUrl) { setQr(null); return; }
    QRCode.toDataURL(hubUrl, { margin: 1, width: 320 }).then(setQr).catch(() => setQr(null));
  }, [hubUrl]);

  async function copy() {
    try { await navigator.clipboard.writeText(hubUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }
  function download() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr; a.download = `${publicSlug ?? "brand"}-games-qr.png`; a.click();
  }

  const backupCard = (
    <div className="ad-card p-6 max-w-md mx-auto space-y-3">
      <h3 className="text-[15px] font-extrabold">Duplicate / back up</h3>
      <p className="text-xs" style={{ color: "var(--ad-muted)" }}>
        Everything (theme, fonts, every game's assets & text) is saved on your brand and auto-saves as you edit.
        Export a copy to back it up or duplicate it onto another account; import to restore or branch a variant.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={exportJson} className="ad-btn">⬇ Export config</button>
        <label className="ad-btn cursor-pointer">
          ⬆ Import config
          <input type="file" accept="application/json,.json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
        </label>
      </div>
      {importError ? <p className="text-xs text-red-600 text-center">{importError}</p> : null}
    </div>
  );

  return (
    <div className="space-y-4">
      {!publicSlug || !saved ? (
        <div className="ad-card p-10 text-center space-y-4">
          <div className="text-4xl">🔗</div>
          <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
            {saved ? "Save once to generate your shareable play-hub link and QR." : "You have unsaved changes — save to generate/refresh your QR."}
          </p>
          <button className="ad-btn ad-btn-primary" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save & generate QR"}</button>
        </div>
      ) : (
        <div className="ad-card p-8 max-w-md mx-auto text-center space-y-4">
          <div className="text-2xl">🎮</div>
          <h2 className="text-lg font-extrabold">One QR for all your games</h2>
          <p className="text-sm" style={{ color: "var(--ad-muted)" }}>
            Scanning opens a hub where visitors can play every one of your branded games. No rewards — pure fun.
          </p>
          {qr ? <img src={qr} alt="Play hub QR" className="mx-auto rounded-xl border p-2 bg-white" /> : null}
          <code className="block text-sm break-all rounded-lg border bg-zinc-50 px-3 py-2">{hubUrl}</code>
          <div className="flex justify-center gap-2">
            <button onClick={copy} className="ad-btn">{copied ? "Copied!" : "Copy link"}</button>
            <button onClick={download} className="ad-btn ad-btn-primary">Download QR</button>
            <a href={hubUrl} target="_blank" rel="noreferrer" className="ad-btn">Open hub ↗</a>
          </div>
        </div>
      )}
      {backupCard}
    </div>
  );
}
