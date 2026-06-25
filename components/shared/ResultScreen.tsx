"use client";
import { useEffect } from "react";
import Link from "next/link";
import { PrizeDisplay } from "./PrizeDisplay";
import { VoucherTicket } from "./VoucherTicket";
import { ShareButton } from "./ShareButton";
import { celebrate } from "@/lib/games/celebrate";

export interface ResultScreenProps {
  prize: {
    name: string;
    description?: string | null;
    image_url?: string | null;
    is_loss: boolean;
  } | null;
  voucherCode: string | null;
  flagged?: boolean;
  /** Set when this play landed on a return-visit milestone reward. */
  returnReward?: { visitNumber: number; target: number } | null;
  shareUrl: string;
  campaignName: string;
  brandColor?: string;
  homeUrl?: string;
}

export function ResultScreen({ prize, voucherCode, flagged, returnReward, shareUrl, campaignName, brandColor, homeUrl = "/" }: ResultScreenProps) {
  // Flagged plays: show the prize visual but withhold the code.
  const showVoucher = !!voucherCode && !flagged;
  const showPending = !!prize && !prize.is_loss && (flagged || (!voucherCode && !flagged && !prize.is_loss));
  const isWin = !!prize && !prize.is_loss;

  useEffect(() => {
    if (isWin) {
      const t = setTimeout(() => celebrate(brandColor), 150);
      return () => clearTimeout(t);
    }
  }, [isWin, brandColor]);

  return (
    <section className="space-y-6 animate-[result-in_0.5s_ease-out]">
      {returnReward && isWin ? (
        <div className="border rounded-xl p-3 text-center" style={{ background: "color-mix(in srgb, var(--brand-color, #6d28d9) 12%, white)", color: "var(--brand-color, #6d28d9)" }}>
          <div className="text-sm font-extrabold">🎁 Return reward unlocked!</div>
          <p className="text-xs mt-0.5">Thanks for coming back — this is your visit #{returnReward.visitNumber} bonus.</p>
        </div>
      ) : null}

      {prize ? (
        <PrizeDisplay
          name={prize.name}
          description={prize.description}
          imageUrl={prize.image_url}
          isLoss={prize.is_loss}
        />
      ) : (
        <PrizeDisplay name="Thanks for playing!" isLoss />
      )}

      {showVoucher ? (
        <VoucherTicket
          code={voucherCode!}
          prizeName={prize?.name}
          status="valid"
          copyable
          brandColor={brandColor}
        />
      ) : null}

      {showPending ? (
        <div className="border rounded-xl p-4 bg-amber-50 text-amber-900 text-center">
          <div className="text-sm font-semibold">Voucher pending verification</div>
          <p className="text-sm mt-1">
            We&apos;ll contact you within 24 hours to confirm your prize.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-3 pt-2">
        <Link href={homeUrl} className="btn-arcade w-full text-center">
          BACK TO HOME
        </Link>
        <ShareButton url={shareUrl} title={`${campaignName} — play & win`} />
      </div>
    </section>
  );
}
