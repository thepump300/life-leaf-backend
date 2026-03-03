const { Router }                       = require("express");
const rateLimit                        = require("express-rate-limit");
const { protect }                      = require("../middleware/authMiddleware");
const { reportIncident, getMyIncidents } = require("../controllers/incidentController");

const router = Router();

const incidentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// POST /api/incidents/report — public
router.post("/report", incidentLimiter, reportIncident);

// GET /api/incidents/my — protected
router.get("/my", protect, getMyIncidents);

module.exports = router;
