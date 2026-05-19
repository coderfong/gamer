// Placeholder admin landing. Full admin UI is Phase 2+.
export default function AdminPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-zinc-600">
          Admin UI is built in Phase 2. For Phase 1 verification, seed via{" "}
          <code>supabase/seed.sql</code> and play{" "}
          <a className="underline" href="/play/test-campaign">/play/test-campaign</a>.
        </p>
      </div>
    </main>
  );
}
