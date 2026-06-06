export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded bg-zinc-200 animate-pulse" />
        <div className="h-4 w-40 rounded bg-zinc-100 animate-pulse" />
      </div>
      <div className="h-10 w-full rounded-lg bg-zinc-100 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-4 space-y-3">
            <div className="h-5 w-3/4 rounded bg-zinc-200 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-zinc-100 animate-pulse" />
            <div className="h-12 w-full rounded bg-zinc-100 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-zinc-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
