import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import CodeBotPage from "./CodeBotPage";
import RagBotPage from "./RagBotPage";
import FilesPage from "./FilesPage";
import HistoryPage from "./HistoryPage";

const NAV = [
  { id: "codebot",  label: "CodeBot",  icon: "🔍", desc: "Code Analysis" },
  { id: "ragbot",   label: "RagBot",   icon: "📄", desc: "Document Q&A" },
  { id: "files",    label: "Files",    icon: "🗂️",  desc: "File Manager" },
  { id: "history",  label: "History",  icon: "📜", desc: "Conversations" },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [page, setPage]         = useState("codebot");
  const [collapsed, setCollapsed] = useState(false);

  const current = NAV.find(n => n.id === page);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      <div className="grid-bg" />

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 64 : 220,
        flexShrink: 0,
        background: "var(--bg2)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
        position: "relative",
        zIndex: 10,
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? "20px 12px" : "20px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--accent3), var(--bg3))", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "var(--glow)", animation: "float 3s ease-in-out infinite" }}>
            🛡️
          </div>
          {!collapsed && (
            <div style={{ animation: "fadeIn 0.2s ease" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "var(--accent)", letterSpacing: "0.05em" }}>CYBERSHIELD</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 8, color: "var(--text3)", letterSpacing: "0.15em" }}>AI SECURITY</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map((n, i) => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: collapsed ? "10px 10px" : "10px 14px",
                borderRadius: "var(--radius)",
                border: page === n.id ? "1px solid var(--border2)" : "1px solid transparent",
                background: page === n.id ? "rgba(0,212,255,0.08)" : "transparent",
                color: page === n.id ? "var(--accent)" : "var(--text2)",
                cursor: "pointer",
                transition: "all var(--transition)",
                width: "100%",
                animation: `slideIn 0.3s ${i * 0.05}s ease both`,
                boxShadow: page === n.id ? "var(--glow)" : "none",
                justifyContent: collapsed ? "center" : "flex-start",
              }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
              {!collapsed && (
                <div style={{ textAlign: "left", animation: "fadeIn 0.2s ease" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{n.desc}</div>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* User + controls */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 6 }}>
          {!collapsed && (
            <div style={{ padding: "8px 14px", borderRadius: "var(--radius)", background: "var(--bg3)", animation: "fadeIn 0.2s ease" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "var(--text3)", letterSpacing: "0.1em" }}>LOGGED IN AS</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</div>
            </div>
          )}
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={toggle} className="btn btn-ghost btn-icon btn-sm" style={{ flex: collapsed ? 1 : "none" }} title="Toggle theme">
              {dark ? "☀️" : "🌙"}
            </button>
            <button onClick={() => setCollapsed(c => !c)} className="btn btn-ghost btn-icon btn-sm" style={{ flex: collapsed ? 1 : "none" }} title="Toggle sidebar">
              {collapsed ? "→" : "←"}
            </button>
            {!collapsed && (
              <button onClick={logout} className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: "center", animation: "fadeIn 0.2s ease" }}>
                Logout
              </button>
            )}
          </div>
          {collapsed && (
            <button onClick={logout} className="btn btn-danger btn-icon btn-sm" style={{ width: "100%", justifyContent: "center" }} title="Logout">
              ⏻
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Header */}
        <header style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--glass)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, position: "relative", zIndex: 5 }}>
          <span style={{ fontSize: 22 }}>{current.icon}</span>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900, color: "var(--accent)", letterSpacing: "0.05em" }}>{current.label}</h1>
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{current.desc}</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge badge-green" style={{ animation: "pulse 2s infinite" }}>● ONLINE</span>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflow: "hidden" }} key={page}>
          {page === "codebot"  && <CodeBotPage />}
          {page === "ragbot"   && <RagBotPage />}
          {page === "files"    && <FilesPage />}
          {page === "history"  && <HistoryPage />}
        </div>
      </main>
    </div>
  );
}
