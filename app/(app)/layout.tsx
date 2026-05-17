"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar  from "@/components/layout/TopBar";

interface SessionUser {
  name: string;
  role: string;
  impersonatedBy?: { userId: string; name: string };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { window.location.href = "/login"; return null; }
      return r.json();
    }).then((d) => d && setUser(d.user));
  }, []);

  const exitImpersonation = async () => {
    await fetch("/api/auth/impersonate/exit", { method: "POST" });
    window.location.href = "/dashboard";
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Impersonation banner */}
      {user?.impersonatedBy && (
        <div style={{
          background: "#B07A00", color: "white",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          padding: "8px 20px", fontSize: 13, fontWeight: 500, flexShrink: 0, zIndex: 100,
        }}>
          <span>
            👤 Viewing as <b>{user.name}</b> — logged in as {user.impersonatedBy.name}
          </span>
          <button
            onClick={exitImpersonation}
            style={{ height: 26, padding: "0 12px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 999, fontSize: 12, fontWeight: 600, color: "white", cursor: "pointer" }}>
            Return to my account →
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden" style={{ background: "var(--cloud)" }}>
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto scrollbar-thin p-7 animate-fade-up">{children}</main>
        </div>
      </div>
    </div>
  );
}
