const express      = require("express");
const router       = express.Router();
const Conversation = require("../models/Conversation");
const authMiddleware = require("../middleware/auth");

// ─── POST /api/history/conversations ─────────
router.post("/conversations", authMiddleware, async (req, res) => {
  try {
    const { bot_type, file_id } = req.body;
    if (!bot_type || !["codebot", "ragbot"].includes(bot_type))
      return res.status(400).json({ error: "bot_type must be 'codebot' or 'ragbot'." });

    const convo = new Conversation({
      user_id:  req.user.user_id,
      bot_type,
      file_id:  file_id || null,
      messages: [],
    });
    await convo.save();
    return res.status(201).json({ conversation_id: convo._id, bot_type: convo.bot_type });
  } catch {
    return res.status(500).json({ error: "Failed to create conversation." });
  }
});

// ─── POST /api/history/conversations/:id/messages ─
router.post("/conversations/:conversation_id/messages", authMiddleware, async (req, res) => {
  try {
    const { query, response } = req.body;
    if (!query || !response)
      return res.status(400).json({ error: "Both query and response are required." });

    const convo = await Conversation.findOne({
      _id: req.params.conversation_id,
      user_id: req.user.user_id,
    });
    if (!convo) return res.status(404).json({ error: "Conversation not found." });

    if (convo.messages.length === 0)
      convo.title = query.substring(0, 60) + (query.length > 60 ? "..." : "");

    convo.messages.push({ role: "user",      content: query });
    convo.messages.push({ role: "assistant", content: response });
    await convo.save();

    return res.status(200).json({ message: "Saved.", total_messages: convo.messages.length });
  } catch {
    return res.status(500).json({ error: "Failed to save messages." });
  }
});

// ─── GET /api/history/conversations ──────────
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const filter = { user_id: req.user.user_id };
    if (req.query.bot_type) filter.bot_type = req.query.bot_type;

    const conversations = await Conversation.find(filter)
      .select("_id title bot_type file_id createdAt updatedAt")
      .sort({ updatedAt: -1 });

    return res.status(200).json({ total: conversations.length, conversations });
  } catch {
    return res.status(500).json({ error: "Failed to fetch conversations." });
  }
});

// ─── GET /api/history/conversations/:id ──────
router.get("/conversations/:conversation_id", authMiddleware, async (req, res) => {
  try {
    const convo = await Conversation.findOne({
      _id: req.params.conversation_id,
      user_id: req.user.user_id,
    }).populate("file_id", "original_name mime_type size_bytes createdAt");

    if (!convo) return res.status(404).json({ error: "Conversation not found." });
    return res.status(200).json({ conversation: convo });
  } catch {
    return res.status(500).json({ error: "Failed to fetch conversation." });
  }
});

// ─── DELETE /api/history/conversations/:id ───
router.delete("/conversations/:conversation_id", authMiddleware, async (req, res) => {
  try {
    const result = await Conversation.findOneAndDelete({
      _id: req.params.conversation_id,
      user_id: req.user.user_id,
    });
    if (!result) return res.status(404).json({ error: "Conversation not found." });
    return res.status(200).json({ message: "Deleted." });
  } catch {
    return res.status(500).json({ error: "Failed to delete." });
  }
});

// ─── DELETE /api/history/conversations ───────
router.delete("/conversations", authMiddleware, async (req, res) => {
  try {
    await Conversation.deleteMany({ user_id: req.user.user_id });
    return res.status(200).json({ message: "All conversations cleared." });
  } catch {
    return res.status(500).json({ error: "Failed to clear history." });
  }
});

module.exports = router;
