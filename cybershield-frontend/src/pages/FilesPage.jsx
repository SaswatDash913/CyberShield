import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fileIcon(name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (ext === "pdf")  return "📕";
  if (ext === "docx") return "📘";
  if (["py","js","ts","jsx","tsx"].includes(ext)) return "🐍";
  if (["exe","bat","sh"].includes(ext)) return "⚙️";
  return "📄";
}

export default function FilesPage() {
  const { token } = useAuth();
  const [files, setFiles]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [deleting, setDeleting] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const data = await api("/files", {}, token);
      setFiles(data.files);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true); setError(""); setSuccess("");
    try {
      const form = new FormData();
      form.append("file", file);
      await api("/files/upload", { method: "POST", body: form }, token);
      setSuccess(`"${file.name}" uploaded successfully!`);
      await load();
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  };

  const deleteFile = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(id); setError("");
    try {
      await api(`/files/${id}`, { method: "DELETE" }, token);
      setFiles(f => f.filter(x => x._id !== id));
      setSuccess(`"${name}" deleted.`);
    } catch (e) { setError(e.message); }
    finally { setDeleting(null); }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center", background: "var(--glass)", backdropFilter: "blur(8px)" }}>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-primary btn-sm">
          {uploading ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Uploading...</> : "+ Upload File"}
        </button>
        <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => upload(e.target.files[0])} />
        <span style={{ marginLeft: "auto", color: "var(--text3)", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: "0.1em" }}>
          {files.length} FILE{files.length !== 1 ? "S" : ""} STORED
        </span>
      </div>

      {/* Alerts */}
      <div style={{ padding: "0 24px" }}>
        {error   && <div style={{ background: "rgba(255,68,102,0.1)", border: "1px solid var(--red2)", borderRadius: "var(--radius)", padding: "10px 14px", color: "var(--red)", fontSize: 13, marginTop: 12 }}>⚠️ {error}</div>}
        {success && <div style={{ background: "rgba(0,255,136,0.1)", border: "1px solid var(--green2)", borderRadius: "var(--radius)", padding: "10px 14px", color: "var(--green)", fontSize: 13, marginTop: 12 }}>✅ {success}</div>}
      </div>

      {/* Files list */}
      <div className="scroll-y" style={{ flex: 1, padding: "16px 24px" }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        )}

        {!loading && files.length === 0 && (
          <div style={{ textAlign: "center", padding: 64, animation: "fadeUp 0.5s ease" }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>🗂️</div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text3)", letterSpacing: "0.1em" }}>NO FILES UPLOADED YET</h3>
            <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 8 }}>Upload PDF or DOCX files to use with RagBot</p>
          </div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {files.map((f, i) => (
            <div key={f._id} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, animation: `fadeUp 0.3s ${i * 0.05}s ease both` }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{fileIcon(f.original_name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.original_name}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>{formatSize(f.size_bytes)}</span>
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>{formatDate(f.createdAt)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <span className="badge badge-blue">{f.original_name.split(".").pop().toUpperCase()}</span>
                <button onClick={() => deleteFile(f._id, f.original_name)} disabled={deleting === f._id} className="btn btn-danger btn-icon btn-sm">
                  {deleting === f._id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "🗑️"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
