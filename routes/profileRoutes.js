const { Router }                        = require("express");
const { body }                          = require("express-validator");
const { protect }                       = require("../middleware/authMiddleware");
const { getProfile, setupProfile, updateProfile } = require("../controllers/profileController");

const router = Router();

// GET /api/profile
router.get("/", protect, getProfile);

// POST /api/profile/setup
router.post(
  "/setup",
  protect,
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be blank"),
    body("vehicleNumber").trim().notEmpty().withMessage("Vehicle number is required"),
    body("emergencyContacts")
      .optional()
      .isArray({ max: 2 })
      .withMessage("Max 2 emergency contacts allowed"),
    body("emergencyContacts.*.name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Contact name cannot be blank"),
    body("emergencyContacts.*.phone")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Contact phone cannot be blank"),
  ],
  setupProfile
);

// PUT /api/profile/update
router.put(
  "/update",
  protect,
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be blank"),
    body("vehicleNumber").optional().trim().notEmpty().withMessage("Vehicle number cannot be blank"),
    body("emergencyContacts")
      .optional()
      .isArray({ max: 2 })
      .withMessage("Max 2 emergency contacts allowed"),
  ],
  updateProfile
);

module.exports = router;
