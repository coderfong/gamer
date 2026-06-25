import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockClient } from "./helpers/mockSupabase";

let mock: ReturnType<typeof createMockClient>;
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mock.client }));

import { drawPrize } from "@/lib/prizes/drawPrize";

beforeEach(() => {
  mock = createMockClient();
});

describe("drawPrize RPC contract", () => {
  it("passes flagged=true through to draw_prize_atomic so the SQL skips the voucher claim", async () => {
    mock.rpc.mockResolvedValueOnce({
      data: [{ prize_id: "pr1", voucher_code_id: null, code: null }],
      error: null,
    });
    const result = await drawPrize({ campaignId: "c1", playId: "pl1", flagged: true });

    expect(mock.rpc).toHaveBeenCalledWith("draw_prize_atomic", {
      p_campaign_id: "c1",
      p_play_id: "pl1",
      p_score: null,
      p_flagged: true,
    });
    // Flagged draw resolves a prize but no voucher/code.
    expect(result).toEqual({ prize_id: "pr1", voucher_code_id: null, code: null });
  });

  it("defaults flagged to false and maps a claimed voucher row", async () => {
    mock.rpc.mockResolvedValueOnce({
      data: [{ prize_id: "pr1", voucher_code_id: "v1", code: "SAVE10" }],
      error: null,
    });
    const result = await drawPrize({ campaignId: "c1", playId: "pl1", score: 42 });

    expect(mock.rpc).toHaveBeenCalledWith("draw_prize_atomic", {
      p_campaign_id: "c1",
      p_play_id: "pl1",
      p_score: 42,
      p_flagged: false,
    });
    expect(result).toEqual({ prize_id: "pr1", voucher_code_id: "v1", code: "SAVE10" });
  });

  it("throws when the RPC returns an error (never silently swallows a failed draw)", async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: { message: "deadlock" } });
    await expect(drawPrize({ campaignId: "c1", playId: "pl1" })).rejects.toBeTruthy();
  });
});
