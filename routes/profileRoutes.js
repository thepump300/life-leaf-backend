const { Router }                        = require("express");
const { body }                          = require("express-validator");
const { protect }                       = require("../middleware/authMiddleware");
const { getProfile, setupProfile, updateProfile, placeOrder } = require("../controllers/profileController");

const router = Router();

// GET /api/profile
router.get("/", protect, getProfile);

// POST /api/profile/setup
router.post(
  "/setup",
  protect,
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be blank"),
    body("vehicleNumber")
      .trim().notEmpty().withMessage("Vehicle number is required")
      .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/)
      .withMessage("Invalid format. Use: MH12AB1234 (State·RTO·Series·Number)"),
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
    body("vehicleNumber")
      .optional().trim().notEmpty().withMessage("Vehicle number cannot be blank")
      .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/)
      .withMessage("Invalid format. Use: MH12AB1234 (State·RTO·Series·Number)"),
    body("emergencyContacts")
      .optional()
      .isArray({ max: 2 })
      .withMessage("Max 2 emergency contacts allowed"),
  ],
  updateProfile
);

// POST /api/profile/order  — demo: marks sticker as ordered
router.post("/order", protect, placeOrder);

module.exports = router;
