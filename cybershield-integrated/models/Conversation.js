const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role:    { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    user_id:  { type: String, required: true, index: true },
    bot_type: { type: String, enum: ["codebot", "ragbot"], required: true },
    title:    { type: String, default: "New Conversation" },
    file_id:  { type: mongoose.Schema.Types.ObjectId, ref: "File", default: null },
    messages: [messageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
