const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
    }
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp, username) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"CyberShield" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Email Verification OTP - CyberShield',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hello ${username},</p>
          <p>Thank you for signing up with CyberShield. Please use the following OTP to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">Best regards,<br>CyberShield Team</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = {
  sendOTPEmail
};
