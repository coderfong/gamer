import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { readStudioConfig } from "@/lib/types/studio";
import { RewardsPageClient } from "@/components/site/RewardsPageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const admin = createAdminClient();
  const { data } = await admin.from("brands").select("name").eq("public_slug", params.slug).maybeSingle();
  const name = (data as { name: string } | null)?.name;
  if (!name) return {};
  return {
    title: `${name} Rewards`,
    description: `Join ${name}'s rewards program — collect stamps and unlock rewards.`,
  };
}

// Public rewards page: a customer joins by phone and sees their live stamp card.
// Read-only — stamps are added by staff in-store.
export default async function RewardsPage({ params }: { params: { slug: string } }) {
  const admin = createAdminClient();
  const { data: brand } = await admin
    .from("brands")
    .select("name, studio")
    .eq("public_slug", params.slug)
    .maybeSingle();
  if (!brand) notFound();

  const b = brand as { name: string; studio: unknown };
  const config = readStudioConfig(b.studio);

  return (
    <RewardsPageClient
      slug={params.slug}
      brandName={b.name}
      theme={config.theme}
      stampCard={config.stampCard}
      logoUrl={config.logoUrl}
    />
  );
}
