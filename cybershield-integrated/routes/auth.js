const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const { generateOTP, sendOTPEmail } = require("../utils/mailer");
const authMiddleware = require("../middleware/auth");

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many requests. Please try again after 15 minutes." },
});

// ─────────────────────────────────────────────
//  SIGN UP — Step 1: send OTP
// ─────────────────────────────────────────────
router.post("/signup", otpLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password are required." });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: "Please provide a valid email address." });

    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters." });

    const normalizedName  = name.trim().toLowerCase();
    const normalizedEmail = email.toLowerCase();

    const existingByEmail = await User.findOne({ email: normalizedEmail });
    if (existingByEmail) {
      if (existingByEmail.isVerified)
        return res.status(409).json({ error: "An account with this email already exists. Please sign in." });

      // Unverified — resend OTP
      const otp       = generateOTP();
      const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);
      existingByEmail.name     = normalizedName;
      existingByEmail.password = password;
      existingByEmail.otp      = { code: otp, expiresAt };
      await existingByEmail.save();
      await sendOTPEmail(normalizedEmail, otp, "signup");
      return res.status(200).json({
        message: "OTP resent to your email. Verify to complete sign up.",
        email: normalizedEmail,
      });
    }

    const existingByName = await User.findOne({ name: normalizedName });
    if (existingByName)
      return res.status(409).json({ error: "This username is already taken. Please choose another." });

    const otp       = generateOTP();
    const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);

    await sendOTPEmail(normalizedEmail, otp, "signup");

    const user = new User({
      user_id: uuidv4(),
      name:    normalizedName,
      email:   normalizedEmail,
      password,
      otp:     { code: otp, expiresAt },
      isVerified: false,
    });
    await user.save();

    return res.status(200).json({
      message: "OTP sent to your email. Verify to complete sign up.",
      email: normalizedEmail,
    });
  } catch (err) {
    console.error("signup error:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      if (field === "email") return res.status(409).json({ error: "An account with this email already exists. Please sign in." });
      if (field === "name")  return res.status(409).json({ error: "This username is already taken. Please choose another." });
    }
    return res.status(500).json({ error: "Sign up failed. Please try again." });
  }
});

// ─────────────────────────────────────────────
//  SIGN UP — Step 2: verify OTP
// ─────────────────────────────────────────────
router.post("/signup/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required." });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)           return res.status(404).json({ error: "No account found. Please sign up first." });
    if (user.isVerified) return res.status(400).json({ error: "Account already verified. Please sign in." });
    if (!user.otp?.code) return res.status(400).json({ error: "No OTP found. Please sign up again." });
    if (new Date() > user.otp.expiresAt) return res.status(400).json({ error: "OTP has expired. Please sign up again." });
    if (user.otp.code !== otp.toString()) return res.status(401).json({ error: "Invalid OTP. Please try again." });

    user.otp        = { code: null, expiresAt: null };
    user.isVerified = true;
    await user.save();

    const token = jwt.sign(
      { user_id: user.user_id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(201).json({
      message: `Welcome to CyberShield, ${user.name}! 🛡️`,
      token,
      user: { user_id: user.user_id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("signup/verify error:", err);
    return res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// ─────────────────────────────────────────────
//  SIGN IN
// ─────────────────────────────────────────────
router.post("/signin", async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ error: "Username and password are required." });

    const user = await User.findOne({ name: name.trim().toLowerCase() });
    if (!user)           return res.status(404).json({ error: "No account found with this username." });
    if (!user.isVerified) return res.status(403).json({ error: "Account not verified. Please complete sign up first." });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "Incorrect password. Please try again." });

    const token = jwt.sign(
      { user_id: user.user_id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(200).json({
      message: `Welcome back, ${user.name}!`,
      token,
      user: { user_id: user.user_id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("signin error:", err);
    return res.status(500).json({ error: "Sign in failed. Please try again." });
  }
});

// ─────────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────────
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.user.user_id }).select("-otp -password");
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.status(200).json({ user });
  } catch {
    return res.status(500).json({ error: "Failed to fetch profile." });
  }
});

module.exports = router;
