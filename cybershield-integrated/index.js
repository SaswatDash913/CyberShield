const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth",    require("./routes/auth"));
app.use("/api/files",   require("./routes/files"));
app.use("/api/history", require("./routes/history"));
app.use("/api/chat",    require("./routes/chat"));

app.get("/", (req, res) => res.json({ message: "CyberShield API is running 🛡️" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT || 8000, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 8000}`)
    );
  })
  .catch((err) => console.error("❌ MongoDB error:", err));
