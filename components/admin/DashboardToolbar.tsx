"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type StatusFilter = "all" | "draft" | "active" | "paused" | "ended";
export type SortKey = "recent" | "most_plays" | "name_asc";

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Live" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "recent", label: "Most recent" },
  { value: "most_plays", label: "Most plays" },
  { value: "name_asc", label: "Name (A–Z)" },
];

export function DashboardToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = (searchParams.get("status") as StatusFilter) ?? "all";
  const sort = (searchParams.get("sort") as SortKey) ?? "recent";
  const initialSearch = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local input in sync if the URL changes from elsewhere (e.g. back button).
  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  function setParam(key: string, value: string, defaultValue: string) {
    pushParams((params) => {
      if (value === defaultValue) params.delete(key);
      else params.set(key, value);
    });
  }

  function onSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams((params) => {
        if (value.trim() === "") params.delete("q");
        else params.set("q", value.trim());
      });
    }, 300);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search campaigns…"
        className="flex-1 min-w-[180px] rounded-lg border px-3 py-2 text-sm"
      />
      <select
        value={status}
        onChange={(e) => setParam("status", e.target.value, "all")}
        className="rounded-lg border px-3 py-2 text-sm bg-white"
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={sort}
        onChange={(e) => setParam("sort", e.target.value, "recent")}
        className="rounded-lg border px-3 py-2 text-sm bg-white"
        aria-label="Sort campaigns"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default DashboardToolbar;
