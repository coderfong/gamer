"use client";

import { useEffect, useRef, useState } from "react";

// Thin wrapper around html5-qrcode. Mounts a camera scanner and calls onScan with
// the decoded text. Imported dynamically so the library (which touches navigator/
// DOM) never runs during SSR. Surfaces camera errors (the #1 mobile gotcha is a
// blocked / denied camera) and offers a retry.
export function QrScanner({
  onScan,
  onClose,
}: {
  onScan: (text: string) => void;
  onClose: () => void;
}) {
  const containerId = "qr-reader";
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    handledRef.current = false;
    setError(null);
    setStarting(true);

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void };

        const onDecoded = (decoded: string) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onScan(decoded);
        };
        const cfg = { fps: 10, qrbox: { width: 220, height: 220 } };

        try {
          // Preferred path: ask for the rear camera directly.
          await scanner.start({ facingMode: "environment" }, cfg, onDecoded, () => {});
        } catch {
          // Fallback: enumerate cameras and pick a back-facing one (or the last).
          const cams = await Html5Qrcode.getCameras();
          if (!cams || cams.length === 0) throw new Error("no-camera");
          const back = cams.find((c) => /back|rear|environment/i.test(c.label)) ?? cams[cams.length - 1];
          await scanner.start(back.id, cfg, onDecoded, () => {});
        }
        if (!cancelled) setStarting(false);
      } catch {
        if (!cancelled) {
          setStarting(false);
          setError("Couldn't open the camera. Allow camera access when prompted (the site must be on https), then tap Retry.");
        }
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [onScan, attempt]);

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Scan voucher QR</h3>
        <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-900">
          Close
        </button>
      </div>
      <div id={containerId} className="w-full max-w-xs mx-auto overflow-hidden rounded-lg" style={{ minHeight: 220, background: "#000" }} />
      {error ? (
        <div className="space-y-2 text-center">
          <p className="text-xs text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Retry camera
          </button>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 text-center">
          {starting ? "Starting camera…" : "Point the camera at the customer’s voucher QR code."}
        </p>
      )}
    </div>
  );
}

export default QrScanner;
