"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Send, Kanban, SquareCheckBig, Settings,
  List, Plus, Pencil, Trash2, Check, X, ChevronDown, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/outreach",  label: "Outreach",  icon: Send },
  { href: "/pipeline",  label: "Pipeline",  icon: Kanban },
  { href: "/tasks",     label: "Tasks",     icon: SquareCheckBig },
];

interface CrmList { id: string; name: string; _count?: { contacts: number } }
interface Counts  { contacts: number; deals: number; pendingTasks: number }
interface Me      { name: string; email: string; role: string }

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [lists,    setLists]    = useState<CrmList[]>([]);
  const [counts,   setCounts]   = useState<Counts | null>(null);
  const [me,       setMe]       = useState<Me | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState("");
  const createRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName,  setEditName]  = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const fetchLists = async () => {
    const res = await fetch("/api/lists");
    if (res.ok) setLists(await res.json());
  };

  useEffect(() => {
    fetchLists();
    fetch("/api/counts").then((r) => r.json()).then(setCounts).catch(() => {});
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then((d) => d && setMe(d.user)).catch(() => {});
  }, [pathname]);
  useEffect(() => { if (creating)  setTimeout(() => createRef.current?.focus(), 0); }, [creating]);
  useEffect(() => { if (editingId) setTimeout(() => editRef.current?.focus(),   0); }, [editingId]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setCreating(false); setNewName(""); return; }
    const tempId = `__tmp__${Date.now()}`;
    setLists((p) => [{ id: tempId, name }, ...p]);
    setNewName(""); setCreating(false);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const list = await res.json();
      setLists((p) => p.map((l) => l.id === tempId ? list : l));
      router.push(`/lists/${list.id}`);
    } else {
      setLists((p) => p.filter((l) => l.id !== tempId));
    }
  };

  const saveEdit = async (id: string) => {
    const name = editName.trim();
    setEditingId(null);
    if (!name || name === lists.find((l) => l.id === id)?.name) return;
    setLists((p) => p.map((l) => l.id === id ? { ...l, name } : l));
    await fetch(`/api/lists/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
  };

  const deleteList = async (list: CrmList) => {
    if (!confirm(`Delete "${list.name}"?`)) return;
    setLists((p) => p.filter((l) => l.id !== list.id));
    await fetch(`/api/lists/${list.id}`, { method: "DELETE" });
    if (pathname.startsWith(`/lists/${list.id}`)) router.push("/lists");
  };

  return (
    <aside style={{ width: 240, background: "var(--ink)", borderRight: "1px solid #1A1D27" }}
      className="flex h-full flex-col flex-shrink-0">

      {/* Brand */}
      <div className="flex items-center justify-between px-[18px] pt-4 pb-[18px]">
        <div className="flex items-center gap-2">
          <TrezuMark />
          <span style={{ fontFamily: "'Inter Tight', sans-serif", fontWeight: 700, fontSize: 15, color: "white", letterSpacing: "-0.01em" }}>
            trezu
          </span>
          <span className="chip ink" style={{ fontSize: 10, height: 18, padding: "0 6px", background: "#1F2330", color: "#A6AAB4" }}>
            CRM
          </span>
        </div>
      </div>

      {/* Workspace switcher */}
      <button style={{ margin: "0 12px 12px", padding: "8px 10px", background: "#14161D", borderRadius: 8, border: "1px solid #1F2330", textAlign: "left", cursor: "pointer" }}
        className="flex items-center gap-2.5 w-[calc(100%-24px)]">
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--brand-wash)", color: "var(--brand-deep)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
          T
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 12, fontWeight: 600, color: "white" }}>trezu team</div>
          <div style={{ fontSize: 10, color: "#6E7280", marginTop: 2, fontFamily: "var(--font-mono, monospace)" }}>admin</div>
        </div>
        <ChevronDown size={13} color="#6E7280" />
      </button>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const count =
            href === "/outreach" ? counts?.contacts :
            href === "/pipeline" ? counts?.deals :
            href === "/tasks"    ? counts?.pendingTasks :
            undefined;
          return (
            <Link key={href} href={href}
              className={cn("nav-item", active && "active")}
              style={{ textDecoration: "none" }}>
              <Icon size={15} className="shrink-0" style={{ color: active ? "white" : "#6E7280" }} />
              <span className="flex-1">{label}</span>
              {count != null && (
                <span style={{ fontSize: 10, fontWeight: 500, fontFamily: "var(--font-mono, monospace)", color: active ? "white" : "#6E7280" }}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Lists section */}
      <div className="mt-4 flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between px-[18px] mb-1.5">
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4A4E5A" }}>
            Lists
          </span>
          <button onClick={() => { setCreating(true); setNewName(""); }}
            style={{ background: "transparent", border: 0, color: "#6E7280", cursor: "pointer", display: "inline-flex", padding: 2 }}
            className="hover:text-zinc-200 transition-colors">
            <Plus size={12} />
          </button>
        </div>

        {creating && (
          <div className="flex items-center gap-1 px-2 py-1 mx-2">
            <input ref={createRef} value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setCreating(false); setNewName(""); } }}
              placeholder="List name…"
              style={{ flex: 1, minWidth: 0, background: "#1F2330", border: "1px solid #2A2D36", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "white", outline: "none" }}
            />
            <button onClick={handleCreate} style={{ background: "transparent", border: 0, color: "#6E7280", cursor: "pointer", padding: 2 }}>
              <Check size={12} color="var(--brand)" />
            </button>
            <button onClick={() => { setCreating(false); setNewName(""); }} style={{ background: "transparent", border: 0, color: "#6E7280", cursor: "pointer", padding: 2 }}>
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          {lists.map((list) => {
            const href   = `/lists/${list.id}`;
            const active = pathname === href || pathname.startsWith(href + "/");
            const isEditing = editingId === list.id;
            return (
              <div key={list.id} className="group relative flex items-center">
                {isEditing ? (
                  <div className="flex flex-1 items-center gap-1 px-3 py-1">
                    <input ref={editRef} value={editName} onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => saveEdit(list.id)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(list.id); if (e.key === "Escape") setEditingId(null); }}
                      style={{ flex: 1, minWidth: 0, background: "#1F2330", border: "1px solid var(--brand)", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "white", outline: "none" }}
                    />
                  </div>
                ) : (
                  <>
                    <Link href={href}
                      className={cn("nav-item flex-1 pr-14", active && "active")}
                      style={{ textDecoration: "none", margin: "0 8px" }}>
                      <List size={14} style={{ color: active ? "white" : "#6E7280", flexShrink: 0 }} />
                      <span className="flex-1 truncate">{list.name}</span>
                      {list._count != null && (
                        <span style={{ fontSize: 10, fontWeight: 500, fontFamily: "var(--font-mono, monospace)", color: active ? "white" : "#6E7280" }}>
                          {list._count.contacts}
                        </span>
                      )}
                    </Link>
                    <div className="absolute right-2 hidden items-center gap-0.5 group-hover:flex"
                      style={{ background: "var(--ink)", paddingLeft: 4, borderRadius: 4 }}>
                      <button onClick={(e) => { e.preventDefault(); setEditingId(list.id); setEditName(list.name); }}
                        style={{ background: "transparent", border: 0, cursor: "pointer", padding: 4, color: "#6E7280", display: "inline-flex" }}
                        className="hover:text-zinc-200 rounded">
                        <Pencil size={10} />
                      </button>
                      <button onClick={(e) => { e.preventDefault(); deleteList(list); }}
                        style={{ background: "transparent", border: 0, cursor: "pointer", padding: 4, color: "#6E7280", display: "inline-flex" }}
                        className="hover:text-red-400 rounded">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {lists.length === 0 && !creating && (
            <p style={{ fontSize: 12, color: "#4A4E5A", padding: "4px 18px" }}>No lists yet</p>
          )}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ borderTop: "1px solid #1A1D27", padding: "12px 12px" }}>
        <Link href="/settings"
          className={cn("nav-item", pathname === "/settings" && "active")}
          style={{ textDecoration: "none", margin: 0 }}>
          <Settings size={15} style={{ color: pathname === "/settings" ? "white" : "#6E7280" }} />
          <span className="flex-1">Settings</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: "#6E7280", background: "#1F2330", padding: "2px 5px", borderRadius: 4 }}>⌘,</span>
        </Link>

        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, padding: "6px 4px" }} className="group">
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#1F2330", border: "1px solid #2A2D36", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
            {me ? me.name[0].toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 11, fontWeight: 600, color: "white" }} className="truncate">{me?.name ?? "—"}</div>
            <div style={{ fontSize: 10, color: "#6E7280", fontFamily: "var(--font-mono, monospace)", marginTop: 2 }}>{me?.role ?? ""}</div>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "transparent", border: "1px solid #2A2D36",
              borderRadius: 6, cursor: "pointer", color: "#6E7280",
              padding: "4px 8px", fontSize: 11, fontWeight: 500,
              transition: "all 0.15s", whiteSpace: "nowrap",
            }}
            className="hover:border-rose-800 hover:text-red-400 transition-colors">
            <LogOut size={11} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

function TrezuMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 132 132" fill="none">
      <rect width="132" height="132" rx="10" fill="#0953FF" />
      <path d="M63.13 111.91V68.87h40.17L63.13 111.91ZM63.13 68.87H22.96L63.13 22.96h40.17L63.13 68.87Z" fill="white" />
    </svg>
  );
}
