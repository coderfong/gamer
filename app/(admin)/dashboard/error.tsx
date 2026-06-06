"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="rounded-xl border bg-white p-8 text-center space-y-3">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-zinc-600 max-w-md mx-auto">
        We couldn’t load your campaigns. This is usually temporary.
      </p>
      <button type="button" onClick={reset} className="btn-brand inline-block">
        Try again
      </button>
    </div>
  );
}
