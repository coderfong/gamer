"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/redeem", label: "Redeem" },
];

// Shared chrome for the signed-in client portal: brand header, tab nav, sign-out.
export function PortalShell({ brandName, children }: { brandName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="ad" style={{ minHeight: "100vh", background: "var(--ad-bg)" }}>
      <header
        className="flex items-center justify-between px-6"
        style={{ height: 58, borderBottom: "1px solid var(--ad-border)", background: "var(--ad-surface)" }}
      >
        <div className="font-extrabold">{brandName}</div>
        <form action="/api/portal/logout" method="post">
          <button type="submit" className="ad-btn ad-btn-ghost" style={{ padding: "7px 13px" }}>Sign out</button>
        </form>
      </header>

      <nav className="flex gap-1 px-6 pt-3" style={{ background: "var(--ad-surface)", borderBottom: "1px solid var(--ad-border)" }}>
        {TABS.map((t) => {
          const on = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-t-lg px-4 py-2 text-sm font-semibold"
              style={{
                color: on ? "var(--ad-accent)" : "var(--ad-muted)",
                borderBottom: on ? "2px solid var(--ad-accent)" : "2px solid transparent",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <main className="mx-auto max-w-5xl space-y-6 p-6">{children}</main>
    </div>
  );
}
