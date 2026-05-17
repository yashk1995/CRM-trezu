"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/setup").then((r) => r.json()).then(({ hasUsers }) => {
      if (hasUsers) router.replace("/login");
      else setChecking(false);
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim())          { setError("Name is required"); return; }
    if (!email.trim())         { setError("Email is required"); return; }
    if (password.length < 8)   { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm)   { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = "/dashboard";
      } else {
        setError(data.error ?? "Something went wrong");
      }
    } catch {
      setError("Request failed — check your connection and try again");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 40, padding: "0 12px",
    border: "1px solid #DCDFE5", borderRadius: 8,
    fontSize: 13, color: "#0A0B10", outline: "none",
    background: "white", boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
    fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "#4A4E5A", marginBottom: 6, letterSpacing: "0.01em",
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "var(--font-sans, Inter, sans-serif)" }}>

      {/* ── Left panel ───────────────────────────────────────── */}
      <div style={{ width: "42%", flexShrink: 0, background: "#0A0B10", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -80, bottom: -80, width: 400, height: 400, opacity: 0.04, pointerEvents: "none" }}>
          <svg viewBox="0 0 132 132" fill="none" width="100%" height="100%">
            <path d="M63.1304 111.913V68.8696H103.304L63.1304 111.913ZM63.1304 68.8696H22.9565L63.1304 22.9565H103.304L63.1304 68.8696Z" fill="white"/>
          </svg>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 52px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 52 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "#0953FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 132 132" fill="none">
                <path d="M63.1304 111.913V68.8696H103.304L63.1304 111.913ZM63.1304 68.8696H22.9565L63.1304 22.9565H103.304L63.1304 68.8696Z" fill="white"/>
              </svg>
            </div>
            <svg height="18" viewBox="0 0 132 38" fill="none">
              <path d="M14.8386 3.16113H28.8386L14.8386 19.1611H0.838623L14.8386 3.16113Z" fill="white"/>
              <path d="M14.8386 19.1611H28.8386L14.8386 34.1611V19.1611Z" fill="white"/>
              <path d="M72.7437 11.7603V15.9256H63.0248V30.6032H58.8595V18.6175C58.8595 14.8304 61.9295 11.7603 65.7166 11.7603H72.7437Z" fill="white"/>
              <path d="M119.752 26.438H127.686V11.7603H131.851V22.8889C131.851 27.1494 128.397 30.6032 124.137 30.6032H123.301C119.04 30.6032 115.587 27.1494 115.587 22.8889V11.7603H119.752V26.438Z" fill="white"/>
              <path d="M46.165 26.4375H55.8838V30.6035H48.8574C45.0703 30.6035 42 27.5332 42 23.7461V7H46.165V26.4375Z" fill="white"/>
              <path d="M42.3967 15.9253L42.3967 11.76L56.281 11.76L56.281 15.9253L42.3967 15.9253Z" fill="white"/>
              <path d="M96.5453 11.7603H112.611V19.1121L99.8715 26.1551V26.6184H112.611V30.6032H96.5453V23.2514L109.285 16.2085V15.776H96.5453V11.7603Z" fill="white"/>
              <path d="M84.0479 11.3633C86.0823 11.3633 87.8388 11.7787 89.3174 12.6094C90.8078 13.4401 91.9554 14.5976 92.7598 16.0811C93.5641 17.5527 93.9667 19.2674 93.9668 21.2256C93.9668 21.4748 93.961 21.7425 93.9492 22.0273C93.9374 22.312 93.9192 22.5199 93.8955 22.6504H78.6562C78.7638 23.2946 78.938 23.8828 79.1855 24.4131C79.6232 25.3387 80.2627 26.0504 81.1025 26.5488C81.9542 27.0354 82.9896 27.2793 84.208 27.2793C85.0358 27.2793 85.7513 27.2021 86.3545 27.0479C86.9578 26.8936 87.4486 26.6849 87.8271 26.4238C88.2175 26.1509 88.508 25.8603 88.6973 25.5518C88.7821 25.4216 88.8519 25.2913 88.9072 25.1611H93.623C93.4999 25.7708 93.2596 26.3697 92.9023 26.958C92.4529 27.7057 91.8201 28.3887 91.0039 29.0059C90.1877 29.6111 89.1936 30.0979 88.0225 30.4658C86.8632 30.8218 85.5383 31 84.0479 31C82.025 31 80.2563 30.5837 78.7422 29.7529C77.2283 28.9222 76.045 27.7656 75.1934 26.2822C74.3535 24.7987 73.9336 23.1012 73.9336 21.1904C73.9336 19.2321 74.3592 17.5166 75.2109 16.0449C76.0745 14.5733 77.27 13.4283 78.7959 12.6094C80.3218 11.7787 82.0725 11.3633 84.0479 11.3633ZM84.1016 15.0303C82.9659 15.0303 81.9776 15.2741 81.1377 15.7607C80.3099 16.2354 79.6654 16.9235 79.2041 17.8252C78.9781 18.2787 78.8087 18.7777 78.6963 19.3213H89.1387C89.0855 18.6621 88.9105 18.0389 88.6084 17.4521C88.2417 16.7282 87.6856 16.1461 86.9404 15.707C86.1953 15.2561 85.2488 15.0303 84.1016 15.0303Z" fill="white"/>
            </svg>
          </div>

          <h1 style={{ fontFamily: "'Inter Tight', 'Inter', sans-serif", fontSize: 34, fontWeight: 600, color: "white", letterSpacing: "-0.025em", margin: "0 0 16px", lineHeight: 1.15 }}>
            Set up your<br />workspace.
          </h1>
          <p style={{ fontSize: 14, color: "#6E7280", lineHeight: 1.6, margin: 0, maxWidth: 280 }}>
            Create your admin account to get started. You can invite teammates later.
          </p>

          <div style={{ marginTop: 48, padding: "16px 18px", background: "rgba(9,83,255,0.08)", border: "1px solid rgba(9,83,255,0.2)", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "#4D86FF", margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
              This setup runs once. After creating your account, this page will be disabled.
            </p>
          </div>
        </div>

        <div style={{ padding: "20px 52px", borderTop: "1px solid #1A1D27" }}>
          <p style={{ fontSize: 11, color: "#4A4E5A", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
            trezu CRM · private beta · 2026
          </p>
        </div>
      </div>

      {/* ── Right panel — form ───────────────────────────────── */}
      <div style={{ flex: 1, background: "#F4F5F7", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ background: "white", border: "1px solid #DCDFE5", borderRadius: 16, padding: "36px 32px", boxShadow: "0 4px 24px rgba(10,11,16,0.06)" }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: "'Inter Tight', 'Inter', sans-serif", fontSize: 22, fontWeight: 600, color: "#0A0B10", letterSpacing: "-0.015em", margin: "0 0 6px" }}>
                Create admin account
              </h2>
              <p style={{ fontSize: 13, color: "#6E7280", margin: 0 }}>You'll be the workspace owner</p>
            </div>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input type="text" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Yash Kapur" style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "#0953FF"; e.target.style.boxShadow = "0 0 0 3px #EAF0FF"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "#DCDFE5"; e.target.style.boxShadow = "none"; }} />
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "#0953FF"; e.target.style.boxShadow = "0 0 0 3px #EAF0FF"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "#DCDFE5"; e.target.style.boxShadow = "none"; }} />
              </div>

              <div>
                <label style={labelStyle}>Password <span style={{ color: "#A6AAB4", fontWeight: 400 }}>(min 8 chars)</span></label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "#0953FF"; e.target.style.boxShadow = "0 0 0 3px #EAF0FF"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "#DCDFE5"; e.target.style.boxShadow = "none"; }} />
              </div>

              <div>
                <label style={labelStyle}>Confirm password</label>
                <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "#0953FF"; e.target.style.boxShadow = "0 0 0 3px #EAF0FF"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "#DCDFE5"; e.target.style.boxShadow = "none"; }} />
              </div>

              {error && (
                <div style={{ background: "#FBE3E6", border: "1px solid rgba(214,58,75,0.2)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#962633", fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                marginTop: 4, height: 42, width: "100%",
                background: loading ? "#4A4E5A" : "#0953FF",
                color: "white", border: "none", borderRadius: 999,
                fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", letterSpacing: "-0.01em",
                transition: "background 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {loading ? "Creating account…" : "Create workspace →"}
              </button>
            </form>
          </div>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#A6AAB4" }}>
            Already have an account?{" "}
            <a href="/login" style={{ color: "#0953FF", fontWeight: 500, textDecoration: "none" }}>Sign in</a>
          </p>
        </div>
      </div>

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  );
}
