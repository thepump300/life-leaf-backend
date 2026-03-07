const { Router }   = require("express");
const rateLimit    = require("express-rate-limit");
const { protect }  = require("../middleware/authMiddleware");
const { reportIncident, getMyIncidents, resolveIncident } = require("../controllers/incidentController");

const router = Router();

// Rate-limit: 5 reports per QR per 60 minutes (keyed by qrId in body)
const incidentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body.qrId || req.ip,
  validate: { keyGeneratorIpFallback: false }, // qrId is not an IP, suppress IPv6 check
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many reports for this vehicle. Try again later." },
});

// POST /api/incidents/report — public
router.post("/report", incidentLimiter, reportIncident);

// GET /api/incidents/my — protected
router.get("/my", protect, getMyIncidents);

// PUT /api/incidents/:id/resolve — protected
router.put("/:id/resolve", protect, resolveIncident);

module.exports = router;
