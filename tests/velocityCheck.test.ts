import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockClient } from "./helpers/mockSupabase";

// Swap the admin client for our queue-driven mock. The factory reads `mock`
// lazily (createAdminClient is called inside each function), so re-assigning it
// in beforeEach gives every test a fresh queue.
let mock: ReturnType<typeof createMockClient>;
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mock.client }));

import { preflightCheck, sweep } from "@/lib/fraud/velocityCheck";

beforeEach(() => {
  mock = createMockClient();
});

describe("preflightCheck thresholds", () => {
  const args = { campaignId: "c1", ipHash: "ip1", fingerprint: "fp1", email: "a@b.com" };

  it("passes when every signal is below its limit", async () => {
    // Limits are ip=8, fp=5, email=3. One query each, in that order.
    mock.enqueue({ count: 7 }, { count: 4 }, { count: 2 });
    const v = await preflightCheck(args);
    expect(v.ok).toBe(true);
  });

  it("blocks on IP at the limit (8), before checking fp/email", async () => {
    mock.enqueue({ count: 8 });
    const v = await preflightCheck(args);
    expect(v).toMatchObject({ ok: false, reason: "ip", count: 8, windowMinutes: 5 });
  });

  it("does NOT block on IP one below the limit (7)", async () => {
    mock.enqueue({ count: 7 }, { count: 0 }, { count: 0 });
    const v = await preflightCheck(args);
    expect(v.ok).toBe(true);
  });

  it("blocks on fingerprint at the limit (5)", async () => {
    mock.enqueue({ count: 0 }, { count: 5 });
    const v = await preflightCheck(args);
    expect(v).toMatchObject({ ok: false, reason: "fingerprint" });
  });

  it("blocks on email at the limit (3)", async () => {
    mock.enqueue({ count: 0 }, { count: 0 }, { count: 3 });
    const v = await preflightCheck(args);
    expect(v).toMatchObject({ ok: false, reason: "email" });
  });

  it("skips signals that are null (no query, always ok)", async () => {
    const v = await preflightCheck({ campaignId: "c1", ipHash: null, fingerprint: null, email: null });
    expect(v.ok).toBe(true);
    expect(mock.tables).toHaveLength(0);
  });
});

describe("sweep clustering thresholds", () => {
  const ipRows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ campaign_id: "c1", ip_hash: "ipA", id: `p${i}` }));

  it("flags an IP cluster at the sweep limit (30) and writes one fraud event", async () => {
    mock.enqueue(
      { data: ipRows(30) }, // ip query
      {}, {},               // update + fraud_events insert for the flagged cluster
      { data: [] },         // fingerprint query
      { data: [] },         // email query
    );
    const report = await sweep();
    expect(report.flaggedPlays).toBe(30);
    expect(report.fraudEvents).toBe(1);
  });

  it("does NOT flag an IP cluster one below the limit (29)", async () => {
    mock.enqueue(
      { data: ipRows(29) }, // ip query — under threshold, no update/insert
      { data: [] },         // fingerprint query
      { data: [] },         // email query
    );
    const report = await sweep();
    expect(report.flaggedPlays).toBe(0);
    expect(report.fraudEvents).toBe(0);
  });
});
