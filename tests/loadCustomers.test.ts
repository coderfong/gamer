import { describe, it, expect } from "vitest";
import { createMockClient } from "./helpers/mockSupabase";
import { loadCustomers, inSegment, type CustomerRow } from "@/lib/admin/loadCustomers";

// Relative dates keep the "lapsed" assertions deterministic regardless of the
// wall clock when the suite runs.
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

function find(customers: CustomerRow[], email: string) {
  return customers.find((c) => c.email === email)!;
}

describe("loadCustomers aggregation", () => {
  it("dedupes players by email across campaigns, merges leads, and counts segments", async () => {
    const server = createMockClient();
    const admin = createMockClient();

    // Server-side queries run in this order: campaigns, brands, players, plays,
    // prizes, voucher_codes.
    server.enqueue(
      { data: [ { id: "c1", name: "C1", brand_id: "b1" }, { id: "c2", name: "C2", brand_id: "b1" } ] },
      { data: [ { id: "b1", name: "Acme" } ] },
      { data: [
        { id: "pl1", campaign_id: "c1", name: "Alice", email: "alice@x.com", phone: null, marketing_consent: true,  marketing_consent_at: daysAgo(20), created_at: daysAgo(40) },
        { id: "pl2", campaign_id: "c2", name: "Alice", email: "alice@x.com", phone: null, marketing_consent: false, marketing_consent_at: null,        created_at: daysAgo(6)  },
        { id: "pl3", campaign_id: "c1", name: "Bob",   email: "bob@x.com",   phone: null, marketing_consent: false, marketing_consent_at: null,        created_at: daysAgo(200) },
      ] },
      { data: [
        { id: "play1", campaign_id: "c1", player_id: "pl1", prize_id: "pr1",     status: "completed", started_at: daysAgo(40),  completed_at: daysAgo(40) },
        { id: "play2", campaign_id: "c2", player_id: "pl2", prize_id: "prLoss",  status: "completed", started_at: daysAgo(6),   completed_at: daysAgo(6)  },
        { id: "play3", campaign_id: "c1", player_id: "pl3", prize_id: "pr1",     status: "completed", started_at: daysAgo(200), completed_at: daysAgo(200) },
      ] },
      { data: [ { id: "pr1", is_loss: false }, { id: "prLoss", is_loss: true } ] },
      { data: [ { claimed_by_play_id: "play1", redeemed_at: daysAgo(39) } ] },
    );
    // Lead L1 is a brand-new contact; L2 matches Alice and folds in.
    admin.enqueue(
      { data: [
        { id: "L1", name: "Carol", email: "carol@x.com", phone: null, company: "CarolCo", message: "hi", marketing_consent: true, marketing_consent_at: daysAgo(2), created_at: daysAgo(2), source: "book_a_call" },
        { id: "L2", name: "Alice", email: "alice@x.com", phone: null, company: null, message: null, marketing_consent: false, marketing_consent_at: null, created_at: daysAgo(3), source: "book_a_call" },
      ] },
    );

    const { customers, counts, error } = await loadCustomers(server.client as never, admin.client as never);
    expect(error).toBe(false);
    expect(customers).toHaveLength(3); // Alice (deduped), Bob, Carol

    const alice = find(customers, "alice@x.com");
    expect(alice.plays).toBe(2);          // both campaigns merged
    expect(alice.wins).toBe(1);           // pr1 win + prLoss loss
    expect(alice.redemptions).toBe(1);    // play1 voucher redeemed
    expect(alice.marketingConsent).toBe(true); // consented on pl1
    expect(alice.isLead).toBe(true);      // L2 folded in
    expect(alice.brandNames).toEqual(["Acme"]);

    const carol = find(customers, "carol@x.com");
    expect(carol.plays).toBe(0);
    expect(carol.isLead).toBe(true);

    // Segment counts: 3 total, 2 winners (Alice+Bob), 1 repeat (Alice),
    // 1 lapsed (Bob, last seen 200d ago), 2 consented (Alice + Carol).
    expect(counts).toEqual({ all: 3, winners: 2, repeat: 1, lapsed: 1, consented: 2 });
  });
});

describe("inSegment", () => {
  const base: CustomerRow = {
    key: "k", name: null, email: null, phone: null, plays: 0, wins: 0, redemptions: 0,
    firstSeen: null, lastSeen: null, marketingConsent: false, marketingConsentAt: null,
    isLead: false, leadCompany: null, leadMessage: null, brandNames: [],
  };

  it("classifies winners / repeat / consented", () => {
    expect(inSegment({ ...base, wins: 1 }, "winners")).toBe(true);
    expect(inSegment({ ...base, wins: 0 }, "winners")).toBe(false);
    expect(inSegment({ ...base, plays: 2 }, "repeat")).toBe(true);
    expect(inSegment({ ...base, plays: 1 }, "repeat")).toBe(false);
    expect(inSegment({ ...base, marketingConsent: true }, "consented")).toBe(true);
  });

  it("treats a contact-only lead (0 plays) as never lapsed", () => {
    expect(inSegment({ ...base, plays: 0, lastSeen: daysAgo(999) }, "lapsed")).toBe(false);
    expect(inSegment({ ...base, plays: 1, lastSeen: daysAgo(999) }, "lapsed")).toBe(true);
  });
});
