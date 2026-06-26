import { describe, it, expect } from "vitest";
import { createMockClient } from "./helpers/mockSupabase";
import { loadRoiMetrics } from "@/lib/admin/loadRoiMetrics";

describe("loadRoiMetrics", () => {
  it("builds a cumulative monthly series with repeat-rate and redemptions/customer", async () => {
    const server = createMockClient();
    const admin = createMockClient();

    // Queries: campaigns, players, plays, voucher_codes; then admin: leads.
    server.enqueue(
      { data: [{ id: "c1" }] },
      { data: [
        // Alice: joined Jan, plays in Jan + Feb (becomes repeat in Feb)
        { id: "plA", email: "a@x.com", phone: null, created_at: "2026-01-05T00:00:00Z" },
        // Bob: joined Feb, single play in Feb (never repeat)
        { id: "plB", email: "b@x.com", phone: null, created_at: "2026-02-10T00:00:00Z" },
      ] },
      { data: [
        { id: "p1", player_id: "plA", status: "completed", started_at: "2026-01-06T00:00:00Z", completed_at: "2026-01-06T00:00:00Z" },
        { id: "p2", player_id: "plA", status: "completed", started_at: "2026-02-06T00:00:00Z", completed_at: "2026-02-06T00:00:00Z" },
        { id: "p3", player_id: "plB", status: "completed", started_at: "2026-02-11T00:00:00Z", completed_at: "2026-02-11T00:00:00Z" },
      ] },
      { data: [{ claimed_by_play_id: "p1", redeemed_at: "2026-01-07T00:00:00Z" }] }, // Alice redeemed once in Jan
    );
    admin.enqueue({ data: [] }); // no leads

    const { series, totals } = await loadRoiMetrics(server.client as never, admin.client as never);

    const jan = series.find((s) => s.month === "2026-01")!;
    const feb = series.find((s) => s.month === "2026-02")!;

    // Jan: 1 customer (Alice), 1 play → not repeat yet, 1 redemption.
    expect(jan.cumulativeCustomers).toBe(1);
    expect(jan.repeatRatePct).toBe(0);
    expect(jan.redemptionsPerCustomer).toBe(1);

    // Feb: 2 customers; Alice now has 2 plays → 1 of 2 repeat = 50%.
    expect(feb.cumulativeCustomers).toBe(2);
    expect(feb.repeatRatePct).toBe(50);
    expect(feb.redemptionsPerCustomer).toBe(0.5); // 1 redemption / 2 customers

    expect(totals.customers).toBe(2);
    expect(totals.repeatRatePct).toBe(50);
  });

  it("returns an empty series when there are no contacts", async () => {
    const server = createMockClient();
    const admin = createMockClient();
    server.enqueue({ data: [] }); // no campaigns → players/plays/vouchers skipped
    admin.enqueue({ data: [] }); // no leads
    const { series, totals } = await loadRoiMetrics(server.client as never, admin.client as never);
    expect(series).toHaveLength(0);
    expect(totals.customers).toBe(0);
  });
});
