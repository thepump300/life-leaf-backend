const crypto = require("crypto");
const bcrypt  = require("bcryptjs");

/** Generates a 6-digit OTP, returns { plain, hashed, expiry } */
const generateOTP = async () => {
  const plain  = String(Math.floor(100000 + Math.random() * 900000));
  const hashed = await bcrypt.hash(plain, 10);
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { plain, hashed, expiry };
};

/** Generates a secure random reset token */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = { generateOTP, generateResetToken };
