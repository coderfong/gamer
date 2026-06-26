"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <PortalLoginForm />
    </Suspense>
  );
}

function PortalLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [slug, setSlug] = useState(params.get("b") ?? "");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(params.get("e") ? "That link or key isn't valid." : null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), key: key.trim() }),
      });
      if (!res.ok) {
        setError("Incorrect brand or access key.");
        return;
      }
      router.push("/portal");
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-zinc-50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold">Client sign-in</h1>
          <p className="mt-1 text-sm text-zinc-500">Enter your brand and the access key we sent you.</p>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Brand</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="your-brand"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            autoComplete="off"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Access key</span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
