/* ============================================================
   ADMIN SHELL — sidebar + topbar wrapper for owner pages
   ============================================================ */
function Sidebar({ active = "campaigns" }) {
  const nav = [
    { id: "dashboard", label: "Dashboard", icon: ICON.grid },
    { id: "campaigns", label: "Campaigns", icon: ICON.rocket },
    { id: "analytics", label: "Analytics", icon: ICON.chart },
    { id: "redemptions", label: "Redemptions", icon: ICON.ticket },
    { id: "brand", label: "Brand", icon: ICON.palette },
    { id: "team", label: "Team", icon: ICON.users },
    { id: "billing", label: "Billing", icon: ICON.card },
    { id: "settings", label: "Settings", icon: ICON.gear },
  ];
  return (
    <div className="ad" style={{ width: 234, flex: "0 0 234px", borderRight: `1px solid ${AD.border}`, background: AD.surface, display: "flex", flexDirection: "column", padding: "18px 14px" }}>
      {/* brand lockup */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 18px" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${AD.accent}, #9B7BFF)`, display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 17, boxShadow: "0 2px 6px rgba(109,74,255,.4)" }}>F</div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>FIZZ&POP</div>
          <div style={{ fontSize: 11, color: AD.faint, fontWeight: 600 }}>Gamified Marketing</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {nav.map((n) => (
          <div key={n.id} className={"ad-nav" + (n.id === active ? " on" : "")}>
            <Ic d={n.icon} size={18} />{n.label}
          </div>
        ))}
      </div>

      {/* plan card */}
      <div style={{ marginTop: "auto" }}>
        <div style={{ background: AD.surface2, border: `1px solid ${AD.border}`, borderRadius: 12, padding: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Growth plan</span>
            <Badge tone="violet">Pro</Badge>
          </div>
          <div style={{ height: 6, background: "#ECECF1", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: "62%", height: "100%", background: AD.accent }} />
          </div>
          <div style={{ fontSize: 11.5, color: AD.muted, marginTop: 7 }}>3,100 / 5,000 plays this month</div>
        </div>
      </div>
    </div>
  );
}
window.Sidebar = Sidebar;

function Topbar({ crumbs }) {
  return (
    <div className="ad" style={{ height: 58, flex: "0 0 58px", borderBottom: `1px solid ${AD.border}`, background: AD.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span style={{ color: i === crumbs.length - 1 ? AD.ink : AD.muted, fontWeight: i === crumbs.length - 1 ? 700 : 600 }}>{c}</span>
            {i < crumbs.length - 1 ? <span style={{ color: AD.faint }}>/</span> : null}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="copyfield" style={{ padding: "7px 12px", width: 220, background: AD.surface2 }}>
          <Ic d={ICON.search} size={15} color={AD.faint} />
          <span style={{ color: AD.faint, fontSize: 13 }}>Search…</span>
        </div>
        <button className="ad-btn ad-btn-ghost" style={{ padding: 8 }}><Ic d={ICON.help} size={18} color={AD.muted} /></button>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#FF8A5B,#FF5A4D)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>GS</div>
      </div>
    </div>
  );
}
window.Topbar = Topbar;

function AdminShell({ crumbs, children }) {
  return (
    <div className="ad" style={{ display: "flex", height: "100%", background: AD.bg }}>
      <Sidebar active="campaigns" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar crumbs={crumbs} />
        <div className="ad-scroll" style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
window.AdminShell = AdminShell;
