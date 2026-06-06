"use client";
import { useEffect, useState } from "react";
import { toDataUrl } from "@/lib/utils/qrcode";

export function VoucherCodeDisplay({ code }: { code: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    toDataUrl(code).then(setQr).catch(() => setQr(null));
  }, [code]);

  return (
    <div className="rounded-2xl p-4 bg-white flex flex-col items-center gap-3 shadow-lg">
      <div className="text-xs uppercase tracking-widest text-zinc-500">Your voucher code</div>
      <div className="font-mono text-2xl font-bold tracking-wider text-zinc-900">{code}</div>
      {qr ? <img src={qr} alt="voucher QR" className="h-40 w-40 rounded-lg" /> : null}
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="text-sm font-semibold underline text-zinc-700"
      >
        {copied ? "Copied!" : "Copy code"}
      </button>
    </div>
  );
}
