"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronRight, Search } from "lucide-react";

const CRUMBS: Record<string, string[]> = {
  "/dashboard": ["Dashboard"],
  "/outreach":  ["Outreach"],
  "/pipeline":  ["Pipeline"],
  "/tasks":     ["Tasks"],
  "/settings":  ["Settings"],
};

function getBreadcrumbs(pathname: string): string[] {
  if (CRUMBS[pathname]) return CRUMBS[pathname];
  if (pathname.startsWith("/lists/")) return ["Lists"];
  if (pathname.startsWith("/contacts/")) return ["Outreach", "Contact"];
  return ["CRM"];
}

export default function TopBar() {
  const pathname = usePathname();
  const crumbs   = getBreadcrumbs(pathname);

  return (
    <header
      style={{ height: 56, borderBottom: "1px solid var(--mist)", background: "var(--paper)", flexShrink: 0 }}
      className="flex items-center gap-3.5 px-6"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            <span style={{
              fontWeight:  i === crumbs.length - 1 ? 600 : 500,
              fontSize:    14,
              color:       i === crumbs.length - 1 ? "var(--ink)" : "var(--stone)",
            }}>
              {c}
            </span>
            {i < crumbs.length - 1 && <ChevronRight size={12} color="var(--fog)" />}
          </span>
        ))}
      </div>

      <div className="flex-1" />

      {/* Search pill */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        height: 32, padding: "0 12px", minWidth: 260,
        background: "var(--cloud)", borderRadius: 999,
        border: "1px solid transparent",
      }}>
        <Search size={13} color="var(--stone)" />
        <span style={{ fontSize: 12, color: "var(--fog)", flex: 1 }}>
          Search contacts, deals, notes…
        </span>
        <span style={{
          fontSize: 10, color: "var(--stone)",
          background: "var(--paper)", padding: "2px 5px",
          borderRadius: 4, border: "1px solid var(--mist)",
          fontFamily: "var(--font-mono, monospace)", fontWeight: 500,
        }}>
          ⌘K
        </span>
      </div>

      {/* Bell */}
      <button style={{
        width: 32, height: 32, borderRadius: 8,
        background: "transparent", border: "1px solid var(--mist)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: "var(--stone)",
      }}
        className="hover:bg-cloud transition-colors">
        <Bell size={15} />
      </button>
    </header>
  );
}
