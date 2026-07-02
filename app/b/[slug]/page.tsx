import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { readStudioConfig } from "@/lib/types/studio";
import { PlayHub } from "@/components/play/PlayHub";
import { WhaleTeaLoopDemo } from "@/components/site/WhaleTeaLoopDemo";

export const dynamic = "force-dynamic";

// Flagship full-loop demo — a bespoke, client-only page (rewards page → join →
// stamps → voucher → staff redemption → owner dashboard). Special-cased ahead of
// the DB lookup so it works without a brand row; every other slug is DB-driven.
const FLAGSHIP_SLUG = "whale-tea";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  if (params.slug === FLAGSHIP_SLUG) {
    return {
      title: "Whale Tea — live rewards demo | Gameable Studios",
      description:
        "A live, tappable demo of a branded rewards program: join, collect stamps, unlock a voucher, redeem at the counter, and see the owner dashboard. This is a demo — WhatsApp us to get yours.",
    };
  }
  return {};
}

export default async function BrandHubPage({ params }: { params: { slug: string } }) {
  if (params.slug === FLAGSHIP_SLUG) {
    return <WhaleTeaLoopDemo />;
  }

  const supabase = createClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("name, studio")
    .eq("public_slug", params.slug)
    .maybeSingle();

  if (!brand) notFound();

  const config = readStudioConfig((brand as { studio?: unknown }).studio);
  return <PlayHub brandName={(brand as { name: string }).name} config={config} captureSlug={params.slug} />;
}
