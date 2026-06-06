"use client";

import { useEffect, useRef } from "react";

// Thin wrapper around html5-qrcode. Mounts a camera scanner into a div and
// calls onScan with the decoded text. Imported dynamically so the library
// (which touches navigator/DOM) never runs during SSR.
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void };
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            if (handledRef.current) return;
            handledRef.current = true;
            onScan(decoded);
          },
          () => {
            /* per-frame decode errors are noise; ignore */
          },
        );
      } catch {
        /* camera unavailable / denied — caller still has manual entry */
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Scan voucher QR</h3>
        <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-900">
          Close
        </button>
      </div>
      <div id={containerId} className="w-full max-w-xs mx-auto" />
      <p className="text-xs text-zinc-500 text-center">
        Point the camera at the player’s voucher QR code.
      </p>
    </div>
  );
}

export default QrScanner;
