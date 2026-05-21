import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPage() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [detail, setDetail]               = useState(null);
  const [loading, setLoading]             = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter]               = useState("all");
  const [error, setError]                 = useState("");
  const [deleting, setDeleting]           = useState(null);
  const [clearingAll, setClearingAll]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/history/conversations" : `/history/conversations?bot_type=${filter}`;
      const data = await api(url, {}, token);
      setConversations(data.conversations);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); setSelected(null); setDetail(null); }, [filter]);

  const loadDetail = async (id) => {
    setSelected(id); setDetailLoading(true);
    try {
      const data = await api(`/history/conversations/${id}`, {}, token);
      setDetail(data.conversation);
    } catch (e) { setError(e.message); }
    finally { setDetailLoading(false); }
  };

  const deleteOne = async (id) => {
    if (!confirm("Delete this conversation?")) return;
    setDeleting(id);
    try {
      await api(`/history/conversations/${id}`, { method: "DELETE" }, token);
      setConversations(c => c.filter(x => x._id !== id));
      if (selected === id) { setSelected(null); setDetail(null); }
    } catch (e) { setError(e.message); }
    finally { setDeleting(null); }
  };

  const clearAll = async () => {
    if (!confirm("Delete ALL conversations? This cannot be undone.")) return;
    setClearingAll(true);
    try {
      await api("/history/conversations", { method: "DELETE" }, token);
      setConversations([]); setSelected(null); setDetail(null);
    } catch (e) { setError(e.message); }
    finally { setClearingAll(false); }
  };

  const filtered = conversations;

  return (
    <div style={{ height: "100%", display: "flex" }}>
      {/* Left panel - conversation list */}
      <div style={{ width: 320, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Filters */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--glass)", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["all", "codebot", "ragbot"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: "6px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                transition: "all var(--transition)",
                background: filter === f ? "var(--accent3)" : "transparent",
                color: filter === f ? "white" : "var(--text3)",
              }}>
                {f === "all" ? "All" : f === "codebot" ? "🔍 Code" : "📄 Docs"}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="scroll-y" style={{ flex: 1 }}>
          {loading && <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><div className="spinner" /></div>}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📜</div>
              <p style={{ color: "var(--text3)", fontSize: 12, fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>NO CONVERSATIONS</p>
            </div>
          )}

          {filtered.map((c, i) => (
            <div key={c._id} onClick={() => loadDetail(c._id)}
              style={{
                padding: "14px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer",
                background: selected === c._id ? "rgba(0,212,255,0.06)" : "transparent",
                borderLeft: selected === c._id ? "3px solid var(--accent)" : "3px solid transparent",
                transition: "all var(--transition)", animation: `slideIn 0.3s ${i * 0.04}s ease both`,
              }}
              onMouseEnter={e => { if (selected !== c._id) e.currentTarget.style.background = "var(--bg2)"; }}
              onMouseLeave={e => { if (selected !== c._id) e.currentTarget.style.background = "transparent"; }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{c.bot_type === "codebot" ? "🔍" : "📄"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>
                    {c.title || "Untitled"}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                    <span className={`badge ${c.bot_type === "codebot" ? "badge-blue" : "badge-green"}`}>{c.bot_type}</span>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>{formatDate(c.updatedAt)}</span>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteOne(c._id); }} disabled={deleting === c._id}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 14, padding: 2, transition: "color var(--transition)", flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text3)"}>
                  {deleting === c._id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "✕"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Clear all */}
        {conversations.length > 0 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
            <button onClick={clearAll} disabled={clearingAll} className="btn btn-danger btn-sm" style={{ width: "100%", justifyContent: "center" }}>
              {clearingAll ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Clearing...</> : "🗑️ Clear All Conversations"}
            </button>
          </div>
        )}
      </div>

      {/* Right panel - conversation detail */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selected && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 48, animation: "float 3s ease-in-out infinite" }}>👈</div>
            <p style={{ color: "var(--text3)", fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: "0.1em" }}>SELECT A CONVERSATION</p>
          </div>
        )}

        {selected && detailLoading && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        )}

        {selected && detail && !detailLoading && (
          <>
            <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", background: "var(--glass)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{detail.bot_type === "codebot" ? "🔍" : "📄"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail.title}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{detail.messages.length} messages • {formatDate(detail.createdAt)}</div>
              </div>
              <span className={`badge ${detail.bot_type === "codebot" ? "badge-blue" : "badge-green"}`}>{detail.bot_type}</span>
            </div>

            <div className="scroll-y" style={{ flex: 1, padding: "24px" }}>
              {detail.messages.map((m, i) => {
                const isUser = m.role === "user";
                return (
                  <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14, animation: `messageIn 0.2s ${i * 0.03}s ease both` }}>
                    {!isUser && <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 8, fontSize: 14 }}>{detail.bot_type === "codebot" ? "🔍" : "📄"}</div>}
                    <div style={{
                      maxWidth: "75%", padding: "10px 14px",
                      borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: isUser ? "var(--bg3)" : "var(--bg2)",
                      border: `1px solid ${isUser ? "var(--border2)" : "var(--border)"}`,
                      fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                      fontFamily: isUser ? "var(--font-mono)" : "var(--font-body)",
                      color: "var(--text)",
                    }}>
                      {m.content}
                      <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 4, fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
                        {m.role.toUpperCase()} • {formatDate(m.createdAt)}
                      </div>
                    </div>
                    {isUser && <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 8, fontSize: 14 }}>👤</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {error && <div style={{ padding: 16 }}><div style={{ background: "rgba(255,68,102,0.1)", border: "1px solid var(--red2)", borderRadius: "var(--radius)", padding: "10px 14px", color: "var(--red)", fontSize: 13 }}>⚠️ {error}</div></div>}
      </div>
    </div>
  );
}
