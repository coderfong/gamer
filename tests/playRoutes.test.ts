import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createMockClient } from "./helpers/mockSupabase";

// These two guarantees live inside the route handlers, not in a pure module, so
// we exercise the real handlers with every external dependency stubbed to a
// known-good state and the Supabase client driven by our queued mock.
let mock: ReturnType<typeof createMockClient>;
const h = vi.hoisted(() => ({
  preflightCheck: vi.fn(),
  drawPrize: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mock.client }));
vi.mock("@/lib/fraud/turnstile", () => ({ verifyTurnstileToken: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/fraud/upstashLimits", () => ({ checkAllLimits: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/fraud/velocityCheck", () => ({ preflightCheck: h.preflightCheck }));
vi.mock("@/lib/prizes/drawPrize", () => ({ drawPrize: h.drawPrize }));
vi.mock("@/lib/admin/previewGuard", () => ({ ownsCampaignBySlug: vi.fn(async () => false) }));
vi.mock("@/lib/play/qrToken", () => ({ qrGatingEnabled: () => false, verifySlug: () => true }));

import { POST as startPOST } from "@/app/api/play/[slug]/start/route";
import { POST as submitPOST } from "@/app/api/play/[slug]/submit/route";

beforeEach(() => {
  mock = createMockClient();
  h.preflightCheck.mockReset();
  h.drawPrize.mockReset();
});

function postReq(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("start route — max_plays_per_player enforcement", () => {
  it("returns 429 max_plays_reached when the contact is at the cap", async () => {
    h.preflightCheck.mockResolvedValue({ ok: true });
    mock.enqueue(
      { data: { id: "c1", status: "active", require_capture: false, max_plays_per_player: 1, cooldown_hours: 24, game_type: "spin_wheel" } },
      { data: { id: "pl1" } }, // player insert
      { count: 1 },            // existing plays for this email == cap
    );

    const res = await startPOST(postReq("/api/play/test/start", { email: "a@b.com" }), { params: { slug: "test" } });
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: "max_plays_reached" });
  });

  it("allows the play through to insertion when below the cap", async () => {
    h.preflightCheck.mockResolvedValue({ ok: true });
    mock.enqueue(
      { data: { id: "c1", status: "active", require_capture: false, max_plays_per_player: 3, cooldown_hours: 24, game_type: "spin_wheel" } },
      { data: { id: "pl1" } }, // player insert
      { count: 1 },            // below cap of 3
      { data: { id: "play1" } }, // plays insert
    );

    const res = await startPOST(postReq("/api/play/test/start", { email: "a@b.com" }), { params: { slug: "test" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ playId: "play1", campaignId: "c1" });
  });
});

describe("submit route — flagged plays never leak a voucher", () => {
  const validPlayId = "123e4567-e89b-12d3-a456-426614174000";

  it("nulls voucherCode when the soft velocity check flags the play, even if the draw returned a code", async () => {
    h.preflightCheck.mockResolvedValue({ ok: false, reason: "ip", count: 9, windowMinutes: 5 });
    // The SQL would normally withhold the code for a flagged draw; we return one
    // anyway to prove the route layer also refuses to expose it.
    h.drawPrize.mockResolvedValue({ prize_id: "pr1", voucher_code_id: "v1", code: "SECRET" });
    mock.enqueue(
      { data: { id: "play1", campaign_id: "c1", status: "started", player_id: "pl1", campaigns: { slug: "test", status: "active", game_type: "spin_wheel" } } },
      {},                                                   // plays update (score/meta)
      { data: { email: "a@b.com", fingerprint: "fp" } },   // player lookup
      {},                                                   // fraud_events insert
      { data: { id: "pr1", name: "Prize", description: null, image_url: null, is_loss: false } }, // prize lookup
    );

    const res = await submitPOST(postReq("/api/play/test/submit", { playId: validPlayId }), { params: { slug: "test" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flagged).toBe(true);
    expect(body.voucherCode).toBeNull();
    expect(body.prize).toMatchObject({ id: "pr1" });
    // And the draw was told it was flagged.
    expect(h.drawPrize).toHaveBeenCalledWith(expect.objectContaining({ flagged: true }));
  });

  it("returns the code on a clean (unflagged) play", async () => {
    h.preflightCheck.mockResolvedValue({ ok: true });
    h.drawPrize.mockResolvedValue({ prize_id: "pr1", voucher_code_id: "v1", code: "SAVE10" });
    mock.enqueue(
      { data: { id: "play1", campaign_id: "c1", status: "started", player_id: "pl1", campaigns: { slug: "test", status: "active", game_type: "spin_wheel" } } },
      {},                                                   // plays update
      { data: { email: "a@b.com", fingerprint: "fp" } },   // player lookup
      { data: { id: "pr1", name: "Prize", description: null, image_url: null, is_loss: false } }, // prize lookup
    );

    const res = await submitPOST(postReq("/api/play/test/submit", { playId: validPlayId }), { params: { slug: "test" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flagged).toBe(false);
    expect(body.voucherCode).toBe("SAVE10");
  });
});
