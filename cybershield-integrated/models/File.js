const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    user_id:       { type: String, required: true, index: true },
    original_name: { type: String, required: true },
    stored_name:   { type: String, required: true },
    file_path:     { type: String, required: true },
    mime_type:     { type: String, required: true },
    size_bytes:    { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("File", fileSchema);
