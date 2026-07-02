import type { SupabaseClient } from "@supabase/supabase-js";
import { readStudioConfig } from "@/lib/types/studio";

// Server-side data access for the stamp-card loyalty product. All calls use the
// service-role (admin) client — the public rewards page visitor isn't a Supabase
// auth user, and the staff portal authenticates via its own brand-scoped cookie.

export interface LoyaltyMember {
  id: string;
  name: string | null;
  phone: string;
  marketingConsent: boolean;
}

export interface LoyaltyCard {
  id: string;
  stamps: number;
  goal: number;
  status: "active" | "completed" | "redeemed";
}

export interface LoyaltyVoucher {
  code: string;
  rewardLabel: string;
  status: "active" | "redeemed";
  redeemedAt: string | null;
}

export interface MemberState {
  member: LoyaltyMember;
  card: LoyaltyCard | null;
  voucher: LoyaltyVoucher | null; // latest active voucher, if any
}

// The program parameters a card is created/measured against, from the brand's
// stamp-card studio config.
export interface ProgramConfig {
  goal: number;
  rewardLabel: string;
}

export function programConfig(studioRaw: unknown): ProgramConfig {
  const sc = readStudioConfig(studioRaw).stampCard;
  return { goal: sc.goal, rewardLabel: sc.rewardLabel };
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

// Resolve a published brand by its public slug. Returns id + studio config blob.
export async function findBrandBySlug(
  admin: SupabaseClient,
  slug: string,
): Promise<{ id: string; name: string; studio: unknown } | null> {
  const { data } = await admin
    .from("brands")
    .select("id, name, studio")
    .eq("public_slug", slug)
    .maybeSingle();
  return (data as { id: string; name: string; studio: unknown } | null) ?? null;
}

// Join (or update) a member by phone, and make sure they have an active card.
export async function joinMember(
  admin: SupabaseClient,
  brandId: string,
  input: { name?: string | null; phone: string; marketingConsent?: boolean; goal: number },
): Promise<LoyaltyMember> {
  const phone = normalizePhone(input.phone);
  const { data, error } = await admin
    .from("loyalty_members")
    .upsert(
      {
        brand_id: brandId,
        phone,
        name: input.name?.trim() || null,
        marketing_consent: input.marketingConsent === true,
      },
      { onConflict: "brand_id,phone" },
    )
    .select("id, name, phone, marketing_consent")
    .single();
  if (error || !data) throw new Error(error?.message ?? "join_failed");

  const member: LoyaltyMember = {
    id: data.id as string,
    name: (data.name as string | null) ?? null,
    phone: data.phone as string,
    marketingConsent: Boolean(data.marketing_consent),
  };

  // Ensure an active card exists so the member sees 0/goal immediately.
  const { data: active } = await admin
    .from("loyalty_cards")
    .select("id")
    .eq("member_id", member.id)
    .eq("status", "active")
    .maybeSingle();
  if (!active) {
    await admin
      .from("loyalty_cards")
      .insert({ brand_id: brandId, member_id: member.id, stamps: 0, goal: Math.max(input.goal, 1), status: "active" });
  }

  return member;
}

export async function findMemberByPhone(
  admin: SupabaseClient,
  brandId: string,
  phone: string,
): Promise<LoyaltyMember | null> {
  const { data } = await admin
    .from("loyalty_members")
    .select("id, name, phone, marketing_consent")
    .eq("brand_id", brandId)
    .eq("phone", normalizePhone(phone))
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    name: (data.name as string | null) ?? null,
    phone: data.phone as string,
    marketingConsent: Boolean(data.marketing_consent),
  };
}

// Full member snapshot: current card + latest active voucher.
export async function loadMemberState(
  admin: SupabaseClient,
  brandId: string,
  member: LoyaltyMember,
): Promise<MemberState> {
  const { data: cardRow } = await admin
    .from("loyalty_cards")
    .select("id, stamps, goal, status")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const card: LoyaltyCard | null = cardRow
    ? {
        id: cardRow.id as string,
        stamps: Number(cardRow.stamps),
        goal: Number(cardRow.goal),
        status: cardRow.status as LoyaltyCard["status"],
      }
    : null;

  const { data: voucherRow } = await admin
    .from("loyalty_vouchers")
    .select("code, reward_label, status, redeemed_at")
    .eq("member_id", member.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const voucher: LoyaltyVoucher | null = voucherRow
    ? {
        code: voucherRow.code as string,
        rewardLabel: voucherRow.reward_label as string,
        status: voucherRow.status as LoyaltyVoucher["status"],
        redeemedAt: (voucherRow.redeemed_at as string | null) ?? null,
      }
    : null;

  return { member, card, voucher };
}

export interface AddStampResult {
  cardId: string;
  stamps: number;
  goal: number;
  status: LoyaltyCard["status"];
  voucherCode: string | null;
}

export async function addStamp(
  admin: SupabaseClient,
  brandId: string,
  memberId: string,
  program: ProgramConfig,
): Promise<AddStampResult> {
  const { data, error } = await admin.rpc("loyalty_add_stamp", {
    p_brand_id: brandId,
    p_member_id: memberId,
    p_goal: program.goal,
    p_reward_label: program.rewardLabel,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) throw new Error(error?.message ?? "add_stamp_failed");
  return {
    cardId: row.card_id as string,
    stamps: Number(row.stamps),
    goal: Number(row.goal),
    status: row.status as LoyaltyCard["status"],
    voucherCode: (row.voucher_code as string | null) ?? null,
  };
}

export interface RedeemResult {
  ok: boolean;
  rewardLabel: string | null;
  already: boolean;
}

export async function redeemVoucher(
  admin: SupabaseClient,
  brandId: string,
  code: string,
  staff: string,
): Promise<RedeemResult> {
  const { data, error } = await admin.rpc("loyalty_redeem_voucher", {
    p_brand_id: brandId,
    p_code: code.trim(),
    p_staff: staff,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error) throw new Error(error.message);
  if (!row) return { ok: false, rewardLabel: null, already: false };
  return {
    ok: Boolean(row.ok),
    rewardLabel: (row.reward_label as string | null) ?? null,
    already: Boolean(row.already),
  };
}
