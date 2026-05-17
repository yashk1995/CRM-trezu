"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronRight, Search, X } from "lucide-react";
import ContactAvatar from "@/components/ui/ContactAvatar";

const CRUMBS: Record<string, string[]> = {
  "/dashboard": ["Dashboard"],
  "/outreach":  ["Outreach"],
  "/pipeline":  ["Pipeline"],
  "/tasks":     ["Tasks"],
  "/settings":  ["Settings"],
};

function getBreadcrumbs(pathname: string): string[] {
  if (CRUMBS[pathname]) return CRUMBS[pathname];
  if (pathname.startsWith("/lists/"))    return ["Lists"];
  if (pathname.startsWith("/contacts/")) return ["Outreach", "Contact"];
  return ["CRM"];
}

interface SearchResult {
  type: string;
  id: string;
  title: string;
  sub: string;
  href: string;
  logoUrl?: string;
  stageColor?: string;
}

const TYPE_META: Record<string, { label: string; chipCls: string }> = {
  contact:  { label: "Contact",  chipCls: "chip" },
  deal:     { label: "Deal",     chipCls: "chip brand" },
  task:     { label: "Task",     chipCls: "chip violet" },
  note:     { label: "Note",     chipCls: "chip" },
  call:     { label: "Call",     chipCls: "chip emerald" },
  update:   { label: "Update",   chipCls: "chip brand" },
  telegram: { label: "Telegram", chipCls: "chip brand" },
  twitter:  { label: "Twitter",  chipCls: "chip violet" },
  email:    { label: "Email",    chipCls: "chip amber" },
  meeting:  { label: "Meeting",  chipCls: "chip violet" },
};

export default function TopBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const crumbs   = getBreadcrumbs(pathname);

  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [open,     setOpen]     = useState(false);
  const [focused,  setFocused]  = useState(-1);
  const [loading,  setLoading]  = useState(false);

  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Click outside closes dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) {
      setResults([]); setOpen(false); setLoading(false); return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
        setFocused(-1);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setFocused(-1);
    router.push(href);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((f) => Math.min(f + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((f) => Math.max(f - 1, -1));
    } else if (e.key === "Enter" && focused >= 0) {
      e.preventDefault();
      navigate(results[focused].href);
    } else if (e.key === "Escape") {
      setOpen(false);
      setFocused(-1);
      inputRef.current?.blur();
    }
  };

  const clear = () => { setQuery(""); setResults([]); setOpen(false); setFocused(-1); };

  return (
    <header
      style={{ height: 56, borderBottom: "1px solid var(--mist)", background: "var(--paper)", flexShrink: 0, position: "relative", zIndex: 30 }}
      className="flex items-center gap-3.5 px-6"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            <span style={{ fontWeight: i === crumbs.length - 1 ? 600 : 500, fontSize: 14, color: i === crumbs.length - 1 ? "var(--ink)" : "var(--stone)" }}>
              {c}
            </span>
            {i < crumbs.length - 1 && <ChevronRight size={12} color="var(--fog)" />}
          </span>
        ))}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div ref={containerRef} style={{ position: "relative", width: 300 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          height: 32, padding: "0 10px",
          background: open || query ? "var(--paper)" : "var(--cloud)",
          borderRadius: open && results.length > 0 ? "8px 8px 0 0" : 999,
          border: open || query ? "1px solid var(--brand)" : "1px solid transparent",
          boxShadow: open || query ? "0 0 0 3px var(--brand-wash)" : "none",
          transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
        }}>
          <Search size={13} color={query ? "var(--brand)" : "var(--stone)"} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Search everything…"
            style={{
              flex: 1, border: 0, outline: "none", background: "transparent",
              fontSize: 12, color: "var(--ink)", fontFamily: "var(--font-sans)",
            }}
          />
          {query ? (
            <button onClick={clear} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--fog)", display: "inline-flex", padding: 0, lineHeight: 1 }}>
              <X size={12} />
            </button>
          ) : (
            <span style={{ fontSize: 10, color: "var(--stone)", background: "var(--paper)", padding: "2px 5px", borderRadius: 4, border: "1px solid var(--mist)", fontFamily: "var(--font-mono, monospace)", fontWeight: 500, flexShrink: 0 }}>
              ⌘K
            </span>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
            background: "var(--paper)",
            border: "1px solid var(--brand)",
            borderTop: "1px solid var(--cloud-2)",
            borderRadius: "0 0 12px 12px",
            boxShadow: "0 8px 32px rgba(10,11,16,0.12)",
            overflow: "hidden",
            maxHeight: 420,
            overflowY: "auto",
          }}>
            {loading && results.length === 0 && (
              <div style={{ padding: "14px 16px", fontSize: 12, color: "var(--stone)" }}>Searching…</div>
            )}

            {!loading && results.length === 0 && query.length >= 2 && (
              <div style={{ padding: "14px 16px", fontSize: 12, color: "var(--stone)" }}>
                No results for <b style={{ color: "var(--ink)" }}>"{query}"</b>
              </div>
            )}

            {results.map((r, i) => {
              const meta = TYPE_META[r.type] ?? { label: r.type, chipCls: "chip" };
              const isFocused = i === focused;
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onMouseEnter={() => setFocused(i)}
                  onMouseLeave={() => setFocused(-1)}
                  onClick={() => navigate(r.href)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "9px 14px",
                    background: isFocused ? "var(--cloud)" : "transparent",
                    border: 0, cursor: "pointer", textAlign: "left",
                    borderBottom: i < results.length - 1 ? "1px solid var(--cloud-2)" : "none",
                    transition: "background 0.1s",
                  }}
                >
                  {/* Avatar / icon */}
                  <div style={{ flexShrink: 0 }}>
                    {(r.type === "contact" || r.type === "deal") ? (
                      <ContactAvatar logoUrl={r.logoUrl ?? null} name={r.title} size="xs" />
                    ) : (
                      <div style={{ width: 20, height: 20, borderRadius: 5, background: "var(--cloud-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                        {r.type === "task" ? "✓" : r.type === "call" ? "📞" : r.type === "email" ? "✉" : r.type === "telegram" ? "✈" : "📝"}
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.type === "deal" && r.stageColor && (
                        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: r.stageColor, marginRight: 6, verticalAlign: "middle" }} />
                      )}
                      {r.title}
                    </div>
                    {r.sub && (
                      <div style={{ fontSize: 11, color: "var(--stone)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                        {r.sub}
                      </div>
                    )}
                  </div>

                  {/* Type chip */}
                  <span className={meta.chipCls} style={{ flexShrink: 0, fontSize: 10 }}>{meta.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bell */}
      <button style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: "1px solid var(--mist)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--stone)" }}
        className="hover:bg-cloud transition-colors">
        <Bell size={15} />
      </button>
    </header>
  );
}
