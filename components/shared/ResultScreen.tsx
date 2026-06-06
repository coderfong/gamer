"use client";
import { useEffect } from "react";
import Link from "next/link";
import { PrizeDisplay } from "./PrizeDisplay";
import { VoucherCodeDisplay } from "./VoucherCodeDisplay";
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
  shareUrl: string;
  campaignName: string;
  brandColor?: string;
  homeUrl?: string;
}

export function ResultScreen({ prize, voucherCode, flagged, shareUrl, campaignName, brandColor, homeUrl = "/" }: ResultScreenProps) {
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

      {showVoucher ? <VoucherCodeDisplay code={voucherCode!} /> : null}

      {showPending ? (
        <div className="border rounded-xl p-4 bg-amber-50 text-amber-900 text-center">
          <div className="text-sm font-semibold">Voucher pending verification</div>
          <p className="text-sm mt-1">
            We&apos;ll contact you within 24 hours to confirm your prize.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-3 pt-2">
        <Link href={homeUrl} className="btn-brand w-full text-center">
          Back to home
        </Link>
        <ShareButton url={shareUrl} title={`${campaignName} — play & win`} />
      </div>
    </section>
  );
}
