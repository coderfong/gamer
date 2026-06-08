"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Ic({ d, size = 18 }: { d: string[]; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

const ICON = {
  grid: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  rocket: ["M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2", "M19 3c-4 0-7 1.5-10 5l-2 3 4 4 3-2c3.5-3 5-6 5-10z", "M12.5 8.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0"],
  card: ["M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z", "M2 10h20"],
};

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: ICON.grid },
  { href: "/campaigns", label: "Campaigns", icon: ICON.rocket },
  { href: "/billing", label: "Billing", icon: ICON.card },
];

export function AdminSidebar({ brandName, tier }: { brandName: string; tier?: string | null }) {
  const pathname = usePathname();
  return (
    <aside
      className="ad hidden md:flex"
      style={{
        width: 234,
        flex: "0 0 234px",
        borderRight: "1px solid var(--ad-border)",
        background: "var(--ad-surface)",
        flexDirection: "column",
        padding: "18px 14px",
      }}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 pb-4 pt-1">
        <span
          className="grid place-items-center text-white font-extrabold"
          style={{ width: 34, height: 34, borderRadius: 10, fontSize: 17, background: "linear-gradient(135deg, var(--ad-accent), #9B7BFF)", boxShadow: "0 2px 6px rgba(109,74,255,.4)" }}
        >
          {(brandName || "F").slice(0, 1).toUpperCase()}
        </span>
        <span className="leading-tight">
          <span className="block font-extrabold text-[15px]">{brandName || "gamer"}</span>
          <span className="block text-[11px] font-semibold" style={{ color: "var(--ad-faint)" }}>
            Gamified Marketing
          </span>
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((n) => {
          const on = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link key={n.href} href={n.href} className={`ad-nav${on ? " on" : ""}`}>
              <Ic d={n.icon} />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="rounded-xl p-3" style={{ background: "var(--ad-surface2)", border: "1px solid var(--ad-border)" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-bold">Plan</span>
            <span className="ad-badge" style={{ background: "var(--ad-accent-soft)", color: "var(--ad-accent-ink)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ad-accent-ink)" }} />
              {tier ? tier : "Free"}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded" style={{ background: "#ECECF1" }}>
            <div style={{ width: "62%", height: "100%", background: "var(--ad-accent)" }} />
          </div>
          <div className="mt-1.5 text-[11.5px]" style={{ color: "var(--ad-muted)" }}>
            Plays this month
          </div>
        </div>
      </div>
    </aside>
  );
}
