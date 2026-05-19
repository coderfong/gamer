import { PrizeDisplay } from "./PrizeDisplay";
import { VoucherCodeDisplay } from "./VoucherCodeDisplay";
import { ShareButton } from "./ShareButton";

export interface ResultScreenProps {
  prize: {
    name: string;
    description?: string | null;
    image_url?: string | null;
    is_loss: boolean;
  } | null;
  voucherCode: string | null;
  shareUrl: string;
  campaignName: string;
}

export function ResultScreen({ prize, voucherCode, shareUrl, campaignName }: ResultScreenProps) {
  return (
    <section className="space-y-6">
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
      {voucherCode ? <VoucherCodeDisplay code={voucherCode} /> : null}
      <div className="flex justify-center gap-2">
        <ShareButton url={shareUrl} title={`${campaignName} — play & win`} />
      </div>
    </section>
  );
}
