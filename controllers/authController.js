const jwt                  = require("jsonwebtoken");
const crypto               = require("crypto");
const bcrypt               = require("bcryptjs");
const { validationResult } = require("express-validator");
const User                 = require("../models/User");
const { sendEmail }        = require("../utils/sendEmail");
const { generateOTP, generateResetToken } = require("../utils/generateOTP");

// ── Helpers ───────────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
};

// ── Register ──────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      // If they registered but never verified, resend OTP
      if (!existing.isVerified) {
        const { plain, hashed, expiry } = await generateOTP();
        await User.findByIdAndUpdate(existing._id, {
          otp: hashed,
          otpExpiry: expiry,
        });
        await sendOTPEmail(email, plain, existing.name);
        return res.status(200).json({
          success: true,
          message: "OTP resent to your email. Please verify your account.",
          email,
        });
      }
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const { plain, hashed, expiry } = await generateOTP();

    const user = await User.create({
      name,
      email,
      password,
      otp: hashed,
      otpExpiry: expiry,
      isVerified: false,
    });

    await sendOTPEmail(email, plain, name);

    res.status(201).json({
      success: true,
      message: "OTP sent to your email. Please verify to continue.",
      email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Verify Email OTP ──────────────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email }).select("+otp +otpExpiry");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.isVerified) {
      return sendToken(user, 200, res);
    }
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: "No OTP found. Please request a new one." });
    }
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    const valid = await bcrypt.compare(String(otp), user.otp);
    if (!valid) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp        = undefined;
    user.otpExpiry  = undefined;
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Resend OTP ────────────────────────────────────────────────────────
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Account already verified" });
    }

    const { plain, hashed, expiry } = await generateOTP();
    await User.findByIdAndUpdate(user._id, { otp: hashed, otpExpiry: expiry });

    await sendOTPEmail(email, plain, user.name);

    res.json({ success: true, message: "OTP resent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Login ─────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      // Resend OTP and prompt verification
      const { plain, hashed, expiry } = await generateOTP();
      await User.findByIdAndUpdate(user._id, { otp: hashed, otpExpiry: expiry });
      await sendOTPEmail(email, plain, user.name);
      return res.status(403).json({
        success: false,
        message: "Please verify your email first. A new OTP has been sent.",
        requiresVerification: true,
        email,
      });
    }

    sendToken(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    // Always respond OK to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: "If that email exists, a reset link was sent." });
    }

    const token  = generateResetToken();
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await User.findByIdAndUpdate(user._id, {
      resetToken: hashed,
      resetTokenExpiry: expiry,
    });

    const resetURL = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    await sendEmail(
      email,
      "Reset your Community password",
      `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#06040e;color:#fff;border-radius:16px">
        <h2 style="color:#F07028;margin-bottom:8px">Password Reset</h2>
        <p style="color:rgba(255,255,255,0.7)">Click the button below to reset your password. This link expires in 15 minutes.</p>
        <a href="${resetURL}" style="display:inline-block;margin:24px 0;background:linear-gradient(135deg,#FFB347,#F07028,#E8411A);color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700">Reset Password</a>
        <p style="font-size:12px;color:rgba(255,255,255,0.3)">If you didn't request this, ignore this email.</p>
      </div>
      `
    );

    res.json({ success: true, message: "If that email exists, a reset link was sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Reset Password ────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password) {
      return res.status(400).json({ success: false, message: "Token, email and new password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({ email }).select("+resetToken +resetTokenExpiry");
    if (!user || user.resetToken !== hashed) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset link" });
    }
    if (new Date() > user.resetTokenExpiry) {
      return res.status(400).json({ success: false, message: "Reset link has expired. Please request a new one." });
    }

    user.password         = password;
    user.resetToken       = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    sendToken(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Get current user (protected) ──────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Internal helper ───────────────────────────────────────────────────
async function sendOTPEmail(email, otp, name) {
  await sendEmail(
    email,
    "Your Community verification code",
    `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#06040e;color:#fff;border-radius:16px">
      <h2 style="color:#F07028;margin-bottom:8px">Verify your email</h2>
      <p style="color:rgba(255,255,255,0.7)">Hi ${name}, use the code below to verify your Community account. It expires in 10 minutes.</p>
      <div style="text-align:center;margin:28px 0">
        <div style="display:inline-block;background:rgba(240,112,40,0.12);border:1px solid rgba(240,112,40,0.3);border-radius:12px;padding:20px 40px">
          <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#F07028">${otp}</span>
        </div>
      </div>
      <p style="font-size:12px;color:rgba(255,255,255,0.3)">If you didn't create a Community account, ignore this email.</p>
    </div>
    `
  );
}
