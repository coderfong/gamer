"use client";

// Lightweight browser fingerprint — NOT cryptographically strong, NOT a replacement
// for FingerprintJS Pro. It's a cheap signal to correlate plays from the same
// device/browser combo and feed into the velocity-check layer.
//
// Signals used: user agent, language, timezone, screen size, color depth,
// hardwareConcurrency, deviceMemory, a canvas-text hash.
//
// All client-side; never trust as a primary identity.

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function canvasHash(): string {
  try {
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 60;
    const ctx = c.getContext("2d");
    if (!ctx) return "no-ctx";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 240, 60);
    ctx.fillStyle = "#069";
    ctx.fillText("fingerprint!@#~|", 2, 2);
    ctx.strokeStyle = "rgba(102,204,0,0.7)";
    ctx.beginPath();
    ctx.arc(50, 30, 20, 0, Math.PI * 2);
    ctx.stroke();
    const data = c.toDataURL();
    return djb2(data);
  } catch {
    return "canvas-err";
  }
}

export function computeFingerprint(): string {
  if (typeof window === "undefined") return "";
  const nav = window.navigator;
  const scr = window.screen;
  const parts = [
    nav.userAgent ?? "",
    nav.language ?? "",
    (nav.languages ?? []).join(","),
    String(scr.width),
    String(scr.height),
    String(scr.colorDepth),
    String(nav.hardwareConcurrency ?? ""),
    // @ts-expect-error not on all browsers
    String(nav.deviceMemory ?? ""),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    canvasHash(),
  ];
  return djb2(parts.join("||"));
}
