"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/outreach": "Outreach",
  "/pipeline": "Pipeline",
  "/settings": "Settings",
};

export default function TopBar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "CRM Trezu";

  return (
    <header className="flex h-14 items-center border-b border-zinc-200 bg-white px-6">
      <h1 className="text-sm font-semibold text-zinc-900">{title}</h1>
    </header>
  );
}
