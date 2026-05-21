import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../utils/api";

export default function AuthPage() {
  const { login } = useAuth();
  const { dark, toggle } = useTheme();
  const [mode, setMode]       = useState("signin"); // signin | signup | verify
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm]       = useState({ name: "", email: "", password: "", otp: "" });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSignup = async () => {
    setError(""); setLoading(true);
    try {
      await api("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      setSuccess("OTP sent to your email!");
      setMode("verify");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    setError(""); setLoading(true);
    try {
      const data = await api("/auth/signup/verify", {
        method: "POST",
        body: JSON.stringify({ email: form.email, otp: form.otp }),
      });
      login(data.token, data.user);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSignin = async () => {
    setError(""); setLoading(true);
    try {
      const data = await api("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ name: form.name, password: form.password }),
      });
      login(data.token, data.user);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const submit = mode === "signin" ? handleSignin : mode === "signup" ? handleSignup : handleVerify;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "24px" }}>
      <div className="grid-bg" />

      {/* Theme toggle */}
      <button onClick={toggle} className="btn btn-ghost btn-icon" style={{ position: "fixed", top: 20, right: 20, zIndex: 100 }}>
        {dark ? "☀️" : "🌙"}
      </button>

      {/* Decorative orbs */}
      <div style={{ position: "fixed", top: "20%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "20%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,136,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeUp 0.6s ease forwards" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, var(--accent3), var(--bg3))", border: "1px solid var(--accent)", boxShadow: "var(--glow)", marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>
            <span style={{ fontSize: 28 }}>🛡️</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 900, letterSpacing: "0.05em", color: "var(--accent)", textShadow: "0 0 20px rgba(0,212,255,0.4)" }}>
            CYBERSHIELD
          </h1>
          <p style={{ color: "var(--text3)", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.2em", marginTop: 4 }}>
            AI SECURITY PLATFORM
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32, animation: "fadeUp 0.6s 0.1s ease both" }}>
          {/* Tabs */}
          {mode !== "verify" && (
            <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "var(--bg)", borderRadius: "var(--radius)", padding: 4 }}>
              {["signin", "signup"].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                  style={{ flex: 1, padding: "8px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", transition: "all var(--transition)",
                    background: mode === m ? "var(--accent3)" : "transparent",
                    color: mode === m ? "white" : "var(--text3)",
                    boxShadow: mode === m ? "var(--glow)" : "none",
                  }}>
                  {m === "signin" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>
          )}

          {mode === "verify" && (
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📧</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--accent)", letterSpacing: "0.1em" }}>VERIFY YOUR EMAIL</h2>
              <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 6 }}>{success}</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name field */}
            {(mode === "signup" || mode === "signin") && (
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", marginBottom: 6 }}>USERNAME</label>
                <input className="input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="your_username" onKeyDown={e => e.key === "Enter" && submit()} />
              </div>
            )}

            {/* Email field (signup only) */}
            {mode === "signup" && (
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", marginBottom: 6 }}>EMAIL</label>
                <input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" onKeyDown={e => e.key === "Enter" && submit()} />
              </div>
            )}

            {/* Password */}
            {mode !== "verify" && (
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", marginBottom: 6 }}>PASSWORD</label>
                <input className="input" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} />
              </div>
            )}

            {/* OTP */}
            {mode === "verify" && (
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-display)", fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", marginBottom: 6 }}>ONE-TIME PASSWORD</label>
                <input className="input" value={form.otp} onChange={e => set("otp", e.target.value)} placeholder="123456" maxLength={6} style={{ textAlign: "center", fontSize: 24, letterSpacing: "0.3em", fontFamily: "var(--font-mono)" }} onKeyDown={e => e.key === "Enter" && submit()} />
              </div>
            )}

            {/* Error / Success */}
            {error   && <div style={{ background: "rgba(255,68,102,0.1)", border: "1px solid var(--red2)", borderRadius: "var(--radius)", padding: "10px 14px", color: "var(--red)", fontSize: 13 }}>⚠️ {error}</div>}

            {/* Submit */}
            <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Processing...</> :
                mode === "signin" ? "→ ACCESS SYSTEM" :
                mode === "signup" ? "→ CREATE ACCOUNT" : "→ VERIFY & ENTER"}
            </button>

            {mode === "verify" && (
              <button className="btn btn-ghost" onClick={() => { setMode("signup"); setError(""); }} style={{ width: "100%", justifyContent: "center" }}>
                ← Back to signup
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", color: "var(--text3)", fontSize: 12, marginTop: 20, fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
          SECURED BY AI • POWERED BY GEMINI
        </p>
      </div>
    </div>
  );
}
