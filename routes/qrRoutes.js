const { Router }    = require("express");
const rateLimit     = require("express-rate-limit");
const { getByQrId } = require("../controllers/qrController");

const router = Router();

const qrLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// GET /api/qr/:qrId — public
router.get("/:qrId", qrLimiter, getByQrId);

module.exports = router;
