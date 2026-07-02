import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readStudioConfig } from "@/lib/types/studio";
import { PlayHub } from "@/components/play/PlayHub";

export const dynamic = "force-dynamic";

export default async function BrandHubPage({ params }: { params: { slug: string } }) {
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
