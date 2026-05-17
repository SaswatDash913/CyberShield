const express = require("express");
const router  = express.Router();
const axios   = require("axios");
const fs      = require("fs");
const path    = require("path");
const FormData = require("form-data");

const authMiddleware = require("../middleware/auth");
const Conversation   = require("../models/Conversation");
const File           = require("../models/File");

const CODEBOT_URL = process.env.CODEBOT_URL || "http://localhost:3000";
const RAGBOT_URL  = process.env.RAGBOT_URL  || "http://localhost:5000";

// ─────────────────────────────────────────────
//  Helper: save a message pair to a conversation
// ─────────────────────────────────────────────
async function saveMessage(conversation, query, response) {
  if (conversation.messages.length === 0) {
    conversation.title = query.substring(0, 60) + (query.length > 60 ? "..." : "");
  }
  conversation.messages.push({ role: "user",      content: query });
  conversation.messages.push({ role: "assistant", content: response });
  await conversation.save();
}

// ─────────────────────────────────────────────
//  POST /api/chat/codebot
//
//  Body:
//    { query: string, conversation_id?: string }
//
//  - Calls CodeBot Python service with the user's query
//  - Saves the exchange to MongoDB conversation history
//  - Auto-creates a conversation if conversation_id is not supplied
// ─────────────────────────────────────────────
router.post("/codebot", authMiddleware, async (req, res) => {
  try {
    const { query, conversation_id } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: "query is required." });
    }

    // Find or create conversation
    let convo;
    if (conversation_id) {
      convo = await Conversation.findOne({
        _id: conversation_id,
        user_id: req.user.user_id,
        bot_type: "codebot",
      });
      if (!convo) {
        return res.status(404).json({ error: "Conversation not found." });
      }
    } else {
      convo = new Conversation({
        user_id:  req.user.user_id,
        bot_type: "codebot",
        messages: [],
      });
      await convo.save();
    }

    // Call CodeBot service
    let botResponse;
    try {
      const { data } = await axios.post(
        `${CODEBOT_URL}/codeanalyse`,
        { query: query.trim(), user_id: req.user.user_id },
        { timeout: 60000 }
      );
      botResponse = data.response || data.error || "No response from CodeBot.";
    } catch (err) {
      const detail = err.response?.data?.error || err.message;
      return res.status(502).json({
        error: `CodeBot service is unreachable. Make sure CodeBot.py is running on port ${CODEBOT_URL.split(":").pop()}.`,
        detail,
      });
    }

    // Persist the exchange
    await saveMessage(convo, query.trim(), botResponse);

    return res.status(200).json({
      conversation_id: convo._id,
      response: botResponse,
      total_messages: convo.messages.length,
    });
  } catch (err) {
    console.error("codebot route error:", err);
    return res.status(500).json({ error: "Chat request failed." });
  }
});

// ─────────────────────────────────────────────
//  POST /api/chat/ragbot/upload
//
//  Multipart form-data:
//    file      — pdf or docx
//    file_id   — MongoDB File._id (already uploaded via /api/files/upload)
//    conversation_id? — optional, auto-created if absent
//
//  - Reads the file from disk using the stored_path from MongoDB
//  - Forwards it to RagBot /fileup for embedding
//  - Returns conversation_id so the client can continue chatting
// ─────────────────────────────────────────────
router.post("/ragbot/upload", authMiddleware, async (req, res) => {
  try {
    const { file_id, conversation_id } = req.body;

    if (!file_id) {
      return res.status(400).json({ error: "file_id is required. Upload the file first via POST /api/files/upload." });
    }

    // Verify the file belongs to this user
    const fileDoc = await File.findOne({ _id: file_id, user_id: req.user.user_id });
    if (!fileDoc) {
      return res.status(404).json({ error: "File not found or access denied." });
    }

    if (!fs.existsSync(fileDoc.file_path)) {
      return res.status(404).json({ error: "Physical file missing on disk. Please re-upload." });
    }

    // Find or create conversation
    let convo;
    if (conversation_id) {
      convo = await Conversation.findOne({
        _id: conversation_id,
        user_id: req.user.user_id,
        bot_type: "ragbot",
      });
      if (!convo) return res.status(404).json({ error: "Conversation not found." });
    } else {
      convo = new Conversation({
        user_id:  req.user.user_id,
        bot_type: "ragbot",
        file_id:  fileDoc._id,
        messages: [],
      });
      await convo.save();
    }

    // Forward the file to RagBot for embedding
    try {
      const form = new FormData();
      form.append("file", fs.createReadStream(fileDoc.file_path), fileDoc.original_name);
      form.append("user_id", req.user.user_id);

      await axios.post(`${RAGBOT_URL}/fileup`, form, {
        headers: form.getHeaders(),
        timeout: 120000, // embedding can be slow
      });
    } catch (err) {
      const detail = err.response?.data?.error || err.message;
      return res.status(502).json({
        error: `RagBot service is unreachable. Make sure RagBot.py is running on port ${RAGBOT_URL.split(":").pop()}.`,
        detail,
      });
    }

    return res.status(200).json({
      message:         "File sent to RagBot and embedded successfully.",
      conversation_id: convo._id,
      file:            { file_id: fileDoc._id, original_name: fileDoc.original_name },
    });
  } catch (err) {
    console.error("ragbot/upload route error:", err);
    return res.status(500).json({ error: "RagBot file upload failed." });
  }
});

// ─────────────────────────────────────────────
//  POST /api/chat/ragbot
//
//  Body:
//    { query: string, conversation_id: string }
//
//  - Calls RagBot /chatnode with the user's question
//  - Saves the exchange to MongoDB
// ─────────────────────────────────────────────
router.post("/ragbot", authMiddleware, async (req, res) => {
  try {
    const { query, conversation_id } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: "query is required." });
    }
    if (!conversation_id) {
      return res.status(400).json({ error: "conversation_id is required. Call POST /api/chat/ragbot/upload first." });
    }

    const convo = await Conversation.findOne({
      _id: conversation_id,
      user_id: req.user.user_id,
      bot_type: "ragbot",
    });
    if (!convo) return res.status(404).json({ error: "Conversation not found." });

    // Call RagBot service
    let botResponse;
    try {
      const { data } = await axios.post(
        `${RAGBOT_URL}/chatnode`,
        { query: query.trim(), user_id: req.user.user_id },
        { timeout: 60000 }
      );
      botResponse = data.response || data.error || "No response from RagBot.";
    } catch (err) {
      const detail = err.response?.data?.error || err.message;
      return res.status(502).json({
        error: `RagBot service is unreachable. Make sure RagBot.py is running on port ${RAGBOT_URL.split(":").pop()}.`,
        detail,
      });
    }

    // Persist the exchange
    await saveMessage(convo, query.trim(), botResponse);

    return res.status(200).json({
      conversation_id: convo._id,
      response:        botResponse,
      total_messages:  convo.messages.length,
    });
  } catch (err) {
    console.error("ragbot route error:", err);
    return res.status(500).json({ error: "Chat request failed." });
  }
});

module.exports = router;
