import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockClient } from "./helpers/mockSupabase";

let mock: ReturnType<typeof createMockClient>;
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mock.client }));

import {
  readReturnReward,
  isMilestoneVisit,
  visitNumberFromPrior,
  maybeClaimReturnReward,
} from "@/lib/prizes/returnReward";

beforeEach(() => {
  mock = createMockClient();
});

describe("readReturnReward", () => {
  it("returns null when disabled, missing, or target < 2", () => {
    expect(readReturnReward(null)).toBeNull();
    expect(readReturnReward({})).toBeNull();
    expect(readReturnReward({ returnReward: { enabled: false, target: 3 } })).toBeNull();
    expect(readReturnReward({ returnReward: { enabled: true, target: 1 } })).toBeNull();
  });

  it("parses a valid config and defaults tier to 1", () => {
    expect(readReturnReward({ returnReward: { enabled: true, target: 3 } })).toEqual({ enabled: true, target: 3, tier: 1 });
    expect(readReturnReward({ returnReward: { enabled: true, target: 5, tier: 2 } })).toEqual({ enabled: true, target: 5, tier: 2 });
  });
});

describe("isMilestoneVisit", () => {
  it("is true only on every Nth visit", () => {
    // target 3 → milestone on visits 3, 6, 9 (prior 2, 5, 8)
    expect(visitNumberFromPrior(2)).toBe(3);
    expect(isMilestoneVisit(0, 3)).toBe(false); // visit 1
    expect(isMilestoneVisit(1, 3)).toBe(false); // visit 2
    expect(isMilestoneVisit(2, 3)).toBe(true); // visit 3
    expect(isMilestoneVisit(3, 3)).toBe(false); // visit 4
    expect(isMilestoneVisit(5, 3)).toBe(true); // visit 6
  });
});

describe("maybeClaimReturnReward", () => {
  const enabled = { returnReward: { enabled: true, target: 3, tier: 1 } };

  it("does nothing when the feature is off (no DB calls)", async () => {
    const out = await maybeClaimReturnReward({
      campaignId: "c1", playId: "p1", config: {}, email: "a@x.com", fingerprint: null, flagged: false,
    });
    expect(out).toBeNull();
    expect(mock.tables).toHaveLength(0);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("does nothing without a stable identity (no email or fingerprint)", async () => {
    const out = await maybeClaimReturnReward({
      campaignId: "c1", playId: "p1", config: enabled, email: null, fingerprint: null, flagged: false,
    });
    expect(out).toBeNull();
    expect(mock.tables).toHaveLength(0);
  });

  it("claims the reward tier on a milestone visit", async () => {
    mock.enqueue({ count: 2 }); // 2 prior completed → this is visit 3 == target
    mock.rpc.mockResolvedValueOnce({ data: [{ prize_id: "rew", voucher_code_id: "v1", code: "BIG" }], error: null });

    const out = await maybeClaimReturnReward({
      campaignId: "c1", playId: "p1", config: enabled, email: "a@x.com", fingerprint: null, flagged: false,
    });
    expect(out).toMatchObject({ visitNumber: 3, target: 3, result: { prize_id: "rew", code: "BIG" } });
    expect(mock.rpc).toHaveBeenCalledWith("claim_prize_by_tier", {
      p_campaign_id: "c1", p_play_id: "p1", p_tier: 1, p_flagged: false,
    });
  });

  it("does not claim on a non-milestone visit", async () => {
    mock.enqueue({ count: 0 }); // visit 1, target 3
    const out = await maybeClaimReturnReward({
      campaignId: "c1", playId: "p1", config: enabled, email: "a@x.com", fingerprint: null, flagged: false,
    });
    expect(out).toBeNull();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});
