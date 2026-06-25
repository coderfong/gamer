import { vi } from "vitest";

// A tiny stand-in for the Supabase admin client used across the money/fraud
// tests. We cannot reach a real Postgres from unit tests, so we drive the
// decision logic by feeding canned responses in call order.
//
// The query builder is chainable (every filter/modifier returns `this`) AND
// awaitable (a `then` so `await supabase.from(x).select(...).eq(...)` resolves —
// that's how the count/head queries are consumed). Terminal `.maybeSingle()` /
// `.single()` resolve the same queue. Each awaited query consumes exactly one
// queued response, so enqueue them in the order the code under test runs.

export interface QueuedResponse {
  data?: unknown;
  error?: unknown;
  count?: number;
}

export interface MockClient {
  client: {
    from: (table: string) => Record<string, unknown>;
    rpc: ReturnType<typeof vi.fn>;
  };
  /** Push responses, consumed in order by awaited/terminal queries. */
  enqueue: (...responses: QueuedResponse[]) => void;
  /** Tables touched, in order — handy for assertions. */
  tables: string[];
  rpc: ReturnType<typeof vi.fn>;
}

export function createMockClient(): MockClient {
  const queue: QueuedResponse[] = [];
  const tables: string[] = [];
  const next = (): QueuedResponse =>
    queue.length ? (queue.shift() as QueuedResponse) : { data: null, error: null, count: 0 };

  const CHAIN_METHODS = [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not",
    "order", "limit", "range", "filter", "match", "or",
  ];

  function builder(): Record<string, unknown> {
    const q: Record<string, unknown> = {};
    for (const m of CHAIN_METHODS) q[m] = () => q;
    q.maybeSingle = () => Promise.resolve(next());
    q.single = () => Promise.resolve(next());
    // Thenable: lets `await <chain>` resolve a queued response.
    q.then = (resolve: (v: QueuedResponse) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(next()).then(resolve, reject);
    return q;
  }

  const rpc = vi.fn().mockResolvedValue({ data: [], error: null });

  return {
    client: {
      from: (table: string) => {
        tables.push(table);
        return builder();
      },
      rpc,
    },
    enqueue: (...responses: QueuedResponse[]) => queue.push(...responses),
    tables,
    rpc,
  };
}
