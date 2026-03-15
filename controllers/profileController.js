const { validationResult } = require("express-validator");
const { randomUUID }        = require("crypto");
const User                  = require("../models/User");

// GET /api/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/profile/setup
const setupProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, vehicleNumber, emergencyContacts, bloodGroup, phone } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate qrId only once
    if (!user.qrId) {
      user.qrId = randomUUID();
    }

    user.name              = name || user.name;
    user.vehicleNumber     = vehicleNumber ? vehicleNumber.toUpperCase().trim() : user.vehicleNumber;
    user.emergencyContacts = emergencyContacts || user.emergencyContacts;
    user.bloodGroup        = bloodGroup || user.bloodGroup;
    if (phone !== undefined) user.phone = phone ? phone.trim() : "";
    user.profileCompleted  = true;

    await user.save();

    const result = user.toObject();
    delete result.password;

    res.status(200).json({ success: true, message: "Profile saved", user: result });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /api/profile/update
const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, vehicleNumber, emergencyContacts, bloodGroup, phone } = req.body;

    const update = {};
    if (name)              update.name              = name;
    if (vehicleNumber)     update.vehicleNumber     = vehicleNumber.toUpperCase().trim();
    if (emergencyContacts) update.emergencyContacts = emergencyContacts;
    if (bloodGroup)        update.bloodGroup        = bloodGroup;
    if (phone !== undefined) update.phone           = phone ? phone.trim() : "";

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/profile/order — demo order placement
const placeOrder = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { stickerOrdered: true },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "Order placed", user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getProfile, setupProfile, updateProfile, placeOrder };
