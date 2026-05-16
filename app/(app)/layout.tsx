"use client";

import Sidebar from "@/components/layout/Sidebar";
import TopBar  from "@/components/layout/TopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--cloud)" }}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-7 animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
