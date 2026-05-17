const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (email, otp, type = "signup") => {
  const expiryMins = process.env.OTP_EXPIRES_MINUTES || 10;
  await transporter.sendMail({
    from:    `"CyberShield 🛡️" <${process.env.GMAIL_USER}>`,
    to:      email,
    subject: "Verify your CyberShield account",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;padding:32px;">
        <h2 style="color:#1a1a2e;">Welcome to CyberShield! 🛡️</h2>
        <p style="color:#444;font-size:15px;">Use the OTP below to verify your account. Expires in <strong>${expiryMins} minutes</strong>.</p>
        <div style="text-align:center;margin:32px 0;">
          <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#0f3460;">${otp}</span>
        </div>
        <p style="color:#888;font-size:13px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { generateOTP, sendOTPEmail };
