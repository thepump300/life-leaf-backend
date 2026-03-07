const { Router }   = require("express");
const rateLimit    = require("express-rate-limit");
const { protect }  = require("../middleware/authMiddleware");
const { getByQrId, regenerateQR } = require("../controllers/qrController");

const router = Router();

const qrLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// GET /api/qr/:qrId — public
router.get("/:qrId", qrLimiter, getByQrId);

// POST /api/qr/regenerate — protected
router.post("/regenerate", protect, regenerateQR);

module.exports = router;
