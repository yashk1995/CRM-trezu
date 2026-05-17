"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, Sparkles, AlertCircle } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How many contacts do I have?",
  "Which deals are in the pipeline and who owns them?",
  "What tasks are overdue?",
  "Show me my T1 contacts",
  "Summarise recent activity",
  "How many deals are in each stage?",
];

export default function AgentPage() {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch current quota without consuming a query
  useEffect(() => {
    fetch("/api/agent")
      .then((r) => r.json())
      .then((d) => setRemaining(d.remaining))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading || remaining === 0) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setMessages((m) => [...m, { role: "assistant", content: data.error ?? "Rate limit reached. You have 5 queries per 3-hour window." }]);
        setRemaining(0);
      } else if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: "Something went wrong. Please try again." }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        setRemaining(data.remaining);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Could not reach the server. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const exhausted = remaining === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", maxWidth: 720, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>
            AI Agent
          </h1>
          <p style={{ fontSize: 14, color: "var(--stone)", marginTop: 6, fontWeight: 500 }}>
            Ask anything about your contacts, deals, and tasks
          </p>
        </div>

        {/* Quota badge */}
        {remaining !== null && (
          <div style={{
            textAlign: "center", padding: "10px 16px",
            background: exhausted ? "var(--rose-wash, #FFF0EF)" : "var(--paper)",
            border: `1px solid ${exhausted ? "var(--rose)" : "var(--mist)"}`,
            borderRadius: 10,
          }}>
            <div style={{
              fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em",
              fontFamily: "'Inter Tight', sans-serif",
              color: exhausted ? "var(--rose)" : "var(--ink)",
            }}>
              {remaining}<span style={{ fontSize: 13, fontWeight: 400, color: "var(--stone)" }}>/5</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--fog)", marginTop: 1, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              queries left
            </div>
            <div style={{ fontSize: 10, color: "var(--fog)", marginTop: 1 }}>resets every 3h</div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 12 }}
        className="scrollbar-thin">

        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Sparkles size={13} color="var(--brand)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--stone)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Try asking
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} disabled={exhausted}
                  style={{
                    fontSize: 12, fontWeight: 500, color: "var(--graphite)",
                    background: "var(--cloud)", border: "1px solid var(--mist)",
                    borderRadius: 999, padding: "6px 12px",
                    cursor: exhausted ? "default" : "pointer",
                    opacity: exhausted ? 0.4 : 1,
                    transition: "all 0.15s",
                  }}
                  className={exhausted ? "" : "hover:border-brand hover:text-brand"}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-start" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <Bot size={14} color="white" />
              </div>
            )}
            <div style={{
              maxWidth: "82%",
              background: msg.role === "user" ? "var(--brand)" : "var(--paper)",
              color: msg.role === "user" ? "white" : "var(--ink)",
              border: msg.role === "user" ? "none" : "1px solid var(--mist)",
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
              padding: "10px 14px",
              fontSize: 13,
              lineHeight: 1.65,
              whiteSpace: "pre-wrap",
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
              <Bot size={14} color="white" />
            </div>
            <div style={{ background: "var(--paper)", border: "1px solid var(--mist)", borderRadius: "2px 12px 12px 12px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="animate-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: "var(--fog)", display: "inline-block", animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Exhausted banner */}
      {exhausted && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--rose-wash, #FFF0EF)", border: "1px solid var(--rose)", borderRadius: 8, padding: "10px 14px", marginBottom: 8, flexShrink: 0 }}>
          <AlertCircle size={14} color="var(--rose)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--rose)", fontWeight: 500 }}>
            You&apos;ve used all 5 queries for this window. Resets automatically after 3 hours.
          </span>
        </div>
      )}

      {/* Input */}
      <div style={{
        background: "var(--paper)", border: `1px solid ${exhausted ? "var(--mist)" : "var(--mist)"}`,
        borderRadius: 12, padding: "8px 8px 8px 14px",
        display: "flex", alignItems: "flex-end", gap: 8,
        flexShrink: 0,
        opacity: exhausted ? 0.6 : 1,
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); autoResize(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={exhausted ? "No queries remaining in this window…" : "Ask about your CRM data…  Enter to send · Shift+Enter for new line"}
          disabled={exhausted || loading}
          rows={1}
          style={{
            flex: 1, background: "transparent", border: 0, outline: "none",
            fontSize: 13, color: "var(--ink)", resize: "none",
            maxHeight: 120, lineHeight: 1.55, padding: "4px 0",
            fontFamily: "var(--font-sans)", overflowY: "auto",
          }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading || exhausted}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 0, flexShrink: 0,
            background: input.trim() && !exhausted && !loading ? "var(--brand)" : "var(--cloud)",
            cursor: input.trim() && !exhausted && !loading ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>
          <Send size={13} color={input.trim() && !exhausted && !loading ? "white" : "var(--fog)"} />
        </button>
      </div>
    </div>
  );
}
