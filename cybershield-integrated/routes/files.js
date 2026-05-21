const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { v4: uuidv4 } = require("uuid");

const File           = require("../models/File");
const authMiddleware = require("../middleware/auth");

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Code files accepted by CodeBot; documents accepted by RagBot
const ALLOWED_EXTENSIONS = [
  // Code / binary (CodeBot)
  ".exe", ".py", ".js", ".ts", ".jsx", ".tsx",
  ".c",   ".cpp", ".cc", ".h", ".hpp", ".cs",
  ".java", ".jar", ".go", ".rs", ".php", ".rb",
  ".sh",  ".bat", ".ps1",
  // Web / config
  ".html", ".css", ".json", ".yaml", ".yml", ".xml",
  // Text
  ".txt", ".md",
  // Documents (RagBot)
  ".pdf", ".docx",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  ALLOWED_EXTENSIONS.includes(ext)
    ? cb(null, true)
    : cb(new Error(`File type "${ext}" not allowed.`), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

// ─── POST /api/files/upload ───────────────────
router.post("/upload", authMiddleware, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const fileDoc = new File({
      user_id:       req.user.user_id,
      original_name: req.file.originalname,
      stored_name:   req.file.filename,
      file_path:     req.file.path,
      mime_type:     req.file.mimetype,
      size_bytes:    req.file.size,
    });
    await fileDoc.save();

    return res.status(201).json({
      message: "File uploaded successfully.",
      file: {
        file_id:       fileDoc._id,
        original_name: fileDoc.original_name,
        size_bytes:    fileDoc.size_bytes,
        uploaded_at:   fileDoc.createdAt,
      },
    });
  } catch (err) {
    console.error("file upload error:", err);
    return res.status(500).json({ error: "File upload failed." });
  }
});

// ─── GET /api/files ───────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const files = await File.find({ user_id: req.user.user_id })
      .select("-file_path -stored_name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ total: files.length, files });
  } catch {
    return res.status(500).json({ error: "Failed to fetch files." });
  }
});

// ─── DELETE /api/files/:file_id ───────────────
router.delete("/:file_id", authMiddleware, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.file_id, user_id: req.user.user_id });
    if (!file) return res.status(404).json({ error: "File not found." });
    if (fs.existsSync(file.file_path)) fs.unlinkSync(file.file_path);
    await file.deleteOne();
    return res.status(200).json({ message: "File deleted successfully." });
  } catch {
    return res.status(500).json({ error: "Failed to delete file." });
  }
});

module.exports = router;
