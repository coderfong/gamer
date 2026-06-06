"use client";
import { useEffect, useState } from "react";
import { toDataUrl } from "@/lib/utils/qrcode";

export type VoucherStatus = "valid" | "redeemed" | "pending";

export interface VoucherTicketProps {
  code: string;
  prizeName?: string | null;
  heading?: string;
  status?: VoucherStatus;
  showQr?: boolean;
  copyable?: boolean;
  brandColor?: string;
}

// A FIZZ&POP-style arcade voucher ticket: colored header band, big mono code,
// a perforated tear edge, a QR stub, and a status stamp. Used on the player
// result screen and as the redemption lookup preview.
export function VoucherTicket({
  code,
  prizeName,
  heading = "PRIZE VOUCHER",
  status = "valid",
  showQr = true,
  copyable = false,
  brandColor,
}: VoucherTicketProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!showQr) return;
    toDataUrl(code).then(setQr).catch(() => setQr(null));
  }, [code, showQr]);

  const accent = brandColor ?? "var(--brand-color)";
  const stamp =
    status === "redeemed"
      ? { text: "REDEEMED", color: "#71717a" }
      : status === "pending"
        ? { text: "PENDING", color: "#d97706" }
        : { text: "VALID", color: "#16a34a" };

  return (
    <div className="relative mx-auto w-full max-w-[320px] select-none">
      {/* perforation notches */}
      <span className="absolute -left-2 top-[116px] h-4 w-4 rounded-full" style={{ background: "var(--arcade-bg, #221b2e)" }} />
      <span className="absolute -right-2 top-[116px] h-4 w-4 rounded-full" style={{ background: "var(--arcade-bg, #221b2e)" }} />

      <div
        className="overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={{ boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)" }}
      >
        {/* header band */}
        <div
          className="relative px-5 py-3 text-center"
          style={{
            background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 85%, white), ${accent})`,
            color: "var(--brand-fg, #fff)",
          }}
        >
          <div className="arcade-title text-xl tracking-wider" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}>
            🎟️ {heading}
          </div>
        </div>

        {/* body */}
        <div className="px-5 pt-4 pb-2 text-center">
          {prizeName ? (
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Prize</div>
              <div className="text-lg font-extrabold text-zinc-900" style={{ fontFamily: "var(--font-body)" }}>
                {prizeName}
              </div>
            </div>
          ) : null}

          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Code</div>
          <div className="font-mono text-2xl font-bold tracking-[0.15em] text-zinc-900">{code}</div>

          {copyable ? (
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="mt-1 text-xs font-semibold underline text-zinc-500"
            >
              {copied ? "Copied!" : "Copy code"}
            </button>
          ) : null}
        </div>

        {/* tear line */}
        <div className="relative my-1 flex items-center">
          <div className="h-0 flex-1 border-t-2 border-dashed border-zinc-200" />
        </div>

        {/* stub: QR + stamp */}
        <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-2">
          {showQr && qr ? (
            <img src={qr} alt="voucher QR" className="h-24 w-24 rounded-lg" />
          ) : (
            <div className="h-24 w-24 rounded-lg bg-zinc-100" />
          )}
          <div
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 text-center arcade-title text-sm leading-tight"
            style={{ color: stamp.color, borderColor: stamp.color, transform: "rotate(-12deg)", opacity: 0.9 }}
          >
            {stamp.text}
          </div>
        </div>
      </div>
    </div>
  );
}
