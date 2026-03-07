const express    = require("express");
const { body }   = require("express-validator");
const rateLimit  = require("express-rate-limit");
const {
  register, verifyEmail, resendOTP,
  login, forgotPassword, resetPassword, getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many attempts. Please wait 15 minutes." },
});

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many OTP requests. Please wait a few minutes." },
});

// Validation rules
const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const loginRules = [
  body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// Auth routes
router.post("/register",         registerRules, register);
router.post("/verify-email",     verifyEmail);
router.post("/resend-otp",       otpLimiter, resendOTP);
router.post("/login",            loginLimiter, loginRules, login);
router.post("/forgot-password",  otpLimiter, forgotPassword);
router.post("/reset-password",   resetPassword);
router.get("/me",                protect, getMe);

module.exports = router;
