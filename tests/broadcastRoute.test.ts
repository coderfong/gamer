import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { createMockClient } from "./helpers/mockSupabase";
import type { CustomerRow } from "@/lib/admin/loadCustomers";

// The one guarantee that must never break: a broadcast reaches ONLY
// marketing-consented contacts with an email. We stub the customer load and the
// mailer, then assert exactly the opted-in recipients are mailed and recorded.
let adminMock: ReturnType<typeof createMockClient>;
const h = vi.hoisted(() => ({
  getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })),
  loadCustomers: vi.fn(),
  sendBroadcastEmail: vi.fn(async (_args: { to: string }) => ({ ok: true })),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: () => ({ auth: { getUser: h.getUser } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => adminMock.client }));
vi.mock("@/lib/admin/loadCustomers", () => ({ loadCustomers: h.loadCustomers }));
vi.mock("@/lib/messaging/resend", () => ({ sendBroadcastEmail: h.sendBroadcastEmail }));

import { POST } from "@/app/api/admin/broadcasts/route";

function customer(email: string | null, marketingConsent: boolean): CustomerRow {
  return {
    key: email ?? "k", name: null, email, phone: null, plays: 0, wins: 0, redemptions: 0,
    firstSeen: null, lastSeen: null, marketingConsent, marketingConsentAt: null,
    isLead: false, leadCompany: null, leadMessage: null, brandNames: [],
  };
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/broadcasts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  adminMock = createMockClient();
  h.getUser.mockClear();
  h.loadCustomers.mockReset();
  h.sendBroadcastEmail.mockReset();
  h.sendBroadcastEmail.mockResolvedValue({ ok: true });
});

describe("POST /api/admin/broadcasts", () => {
  it("emails only consented contacts with an email, and records the send", async () => {
    h.loadCustomers.mockResolvedValue({
      customers: [
        customer("yes1@x.com", true),
        customer("no@x.com", false),   // not consented → excluded
        customer("yes2@x.com", true),
        customer(null, true),          // consented but no email → excluded
      ],
      counts: { all: 4, winners: 0, repeat: 0, lapsed: 0, consented: 3 },
      error: false,
    });
    adminMock.enqueue({ data: { id: "b1" } }); // broadcasts insert .single()

    const res = await POST(postReq({ subject: "Hi", message: "Come back!" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, recipients: 2, sent: 2, failed: 0 });

    const mailed = h.sendBroadcastEmail.mock.calls.map((c) => c[0].to).sort();
    expect(mailed).toEqual(["yes1@x.com", "yes2@x.com"]);
  });

  it("rejects when there are no consented recipients (nothing sent)", async () => {
    h.loadCustomers.mockResolvedValue({
      customers: [customer("no@x.com", false)],
      counts: { all: 1, winners: 0, repeat: 0, lapsed: 0, consented: 0 },
      error: false,
    });

    const res = await POST(postReq({ subject: "Hi", message: "Come back!" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "no_recipients" });
    expect(h.sendBroadcastEmail).not.toHaveBeenCalled();
  });

  it("401s without an authenticated user", async () => {
    h.getUser.mockResolvedValueOnce({ data: { user: null }, error: null } as never);
    const res = await POST(postReq({ subject: "Hi", message: "x" }));
    expect(res.status).toBe(401);
  });
});
