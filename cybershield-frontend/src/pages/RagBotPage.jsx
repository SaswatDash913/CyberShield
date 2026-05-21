import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", animation: "messageIn 0.3s ease", marginBottom: 16 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--green2), #003322)", border: "1px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10, marginTop: 4 }}>
          📄
        </div>
      )}
      <div style={{
        maxWidth: "75%", padding: "12px 16px",
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser ? "linear-gradient(135deg, var(--green2), #005533)" : "var(--bg2)",
        border: isUser ? "1px solid var(--green)" : "1px solid var(--border)",
        color: isUser ? "white" : "var(--text)",
        fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
        boxShadow: isUser ? "var(--glow-g)" : "none",
      }}>
        {msg.content}
        <div style={{ fontSize: 10, color: isUser ? "rgba(255,255,255,0.6)" : "var(--text3)", marginTop: 6, fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
          {new Date(msg.time).toLocaleTimeString()}
        </div>
      </div>
      {isUser && (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 10, marginTop: 4 }}>👤</div>
      )}
    </div>
  );
}

export default function RagBotPage() {
  const { token } = useAuth();
  const [step, setStep]         = useState("upload"); // upload | chat
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [convoId, setConvoId]   = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError]       = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef  = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const uploadFile = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx"].includes(ext)) { setError("Only PDF and DOCX files are supported."); return; }

    setUploading(true); setError("");
    try {
      // Step 1: upload to Node.js
      const form = new FormData();
      form.append("file", file);
      const uploaded = await api("/files/upload", { method: "POST", body: form }, token);

      // Step 2: embed into RagBot
      const embedded = await api("/chat/ragbot/upload", {
        method: "POST",
        body: JSON.stringify({ file_id: uploaded.file.file_id }),
      }, token);

      setConvoId(embedded.conversation_id);
      setFileInfo({ name: file.name, size: file.size });
      setStep("chat");
      setMessages([{ role: "assistant", content: `✅ I've read **${file.name}** and I'm ready to answer your questions about it!`, time: Date.now() }]);
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    uploadFile(e.dataTransfer.files[0]);
  };

  const send = async () => {
    const query = input.trim();
    if (!query || loading) return;
    setInput(""); setError("");

    setMessages(m => [...m, { role: "user", content: query, time: Date.now() }]);
    setLoading(true);

    try {
      const data = await api("/chat/ragbot", {
        method: "POST",
        body: JSON.stringify({ query, conversation_id: convoId }),
      }, token);
      setMessages(m => [...m, { role: "assistant", content: data.response, time: Date.now() }]);
    } catch (e) {
      setError(e.message);
      setMessages(m => m.slice(0, -1));
    } finally { setLoading(false); }
  };

  const reset = () => { setStep("upload"); setMessages([]); setConvoId(null); setFileInfo(null); setError(""); setInput(""); };

  if (step === "upload") return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center", animation: "fadeUp 0.5s ease" }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>📄</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--green)", letterSpacing: "0.05em", marginBottom: 8 }}>DOCUMENT INTELLIGENCE</h2>
        <p style={{ color: "var(--text2)", marginBottom: 32, fontSize: 14 }}>Upload a PDF or DOCX and ask anything about it</p>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--green)" : "var(--border2)"}`,
            borderRadius: "var(--radius-lg)",
            padding: "48px 32px",
            cursor: "pointer",
            transition: "all var(--transition)",
            background: dragOver ? "rgba(0,255,136,0.05)" : "var(--bg2)",
            boxShadow: dragOver ? "var(--glow-g)" : "none",
            animation: "borderGlow 3s ease-in-out infinite",
          }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>{uploading ? "⏳" : "📁"}</div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--text2)", letterSpacing: "0.08em" }}>
            {uploading ? "PROCESSING DOCUMENT..." : "DROP FILE HERE OR CLICK TO BROWSE"}
          </p>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>PDF • DOCX • Max 20MB</p>
          {uploading && <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={e => uploadFile(e.target.files[0])} />

        {error && <div style={{ background: "rgba(255,68,102,0.1)", border: "1px solid var(--red2)", borderRadius: "var(--radius)", padding: "10px 14px", color: "var(--red)", fontSize: 13, marginTop: 16 }}>⚠️ {error}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, alignItems: "center", background: "var(--glass)", backdropFilter: "blur(8px)" }}>
        <span style={{ fontSize: 18 }}>📄</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--green)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileInfo?.name}</span>
        <span className="badge badge-green">Embedded</span>
        <button onClick={reset} className="btn btn-ghost btn-sm">↑ New Document</button>
      </div>

      {/* Messages */}
      <div className="scroll-y" style={{ flex: 1, padding: "24px" }}>
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, animation: "messageIn 0.3s ease" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--green2), #003322)", border: "1px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>📄</div>
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
              <div className="typing"><span style={{ background: "var(--green)" }} /><span style={{ background: "var(--green)" }} /><span style={{ background: "var(--green)" }} /></div>
            </div>
          </div>
        )}
        {error && <div style={{ background: "rgba(255,68,102,0.1)", border: "1px solid var(--red2)", borderRadius: "var(--radius)", padding: "10px 14px", color: "var(--red)", fontSize: 13 }}>⚠️ {error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      <div style={{ padding: "8px 24px", display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--border)" }}>
        {["What is this document about?", "Summarize the key points", "What are the main topics?"].map(q => (
          <button key={q} onClick={() => { setInput(q); }} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>{q}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--glass)", backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea className="input" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Ask anything about the document... (Ctrl+Enter to send)"
            style={{ minHeight: 60, maxHeight: 120, flex: 1 }}
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) send(); }} />
          <button onClick={send} disabled={!input.trim() || loading} className="btn btn-success" style={{ alignSelf: "flex-end", padding: "12px 20px" }}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "→ ASK"}
          </button>
        </div>
      </div>
    </div>
  );
}
