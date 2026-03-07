const { randomUUID } = require("crypto");
const User           = require("../models/User");
const Incident       = require("../models/Incident");

// GET /api/qr/:qrId  — public, no auth required
// Returns ONLY vehicleNumber — no personal data, no phone numbers
const getByQrId = async (req, res) => {
  try {
    const { qrId } = req.params;

    if (!qrId || qrId.length < 10) {
      return res.status(400).json({ success: false, message: "Invalid QR code" });
    }

    const user = await User.findOne({ qrId }).select("vehicleNumber");

    if (!user) {
      return res.status(404).json({ success: false, message: "QR code not found" });
    }

    // Log the scan — increment counter
    User.findByIdAndUpdate(user._id, { $inc: { scanCount: 1 } }).catch(() => {});

    res.json({
      success: true,
      data: { vehicleNumber: user.vehicleNumber },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/qr/regenerate  — protected
// Invalidates old qrId, generates a new UUID
const regenerateQR = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.profileCompleted) {
      return res.status(400).json({ success: false, message: "Complete your profile before regenerating QR" });
    }

    user.qrId = randomUUID();
    await user.save();

    res.json({ success: true, message: "QR regenerated successfully", qrId: user.qrId });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/dashboard/stats  — protected
const getDashboardStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("scanCount profileCompleted emergencyContacts vehicleNumber qrId");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const [total, open, resolved] = await Promise.all([
      Incident.countDocuments({ userId: req.user.id }),
      Incident.countDocuments({ userId: req.user.id, status: "open" }),
      Incident.countDocuments({ userId: req.user.id, status: "resolved" }),
    ]);

    // Safety score: profile (40%) + vehicle (30%) + emergency contacts (30%)
    let score = 0;
    if (user.profileCompleted) score += 40;
    if (user.vehicleNumber)    score += 30;
    if (user.emergencyContacts?.length > 0) score += 30;

    res.json({
      success: true,
      stats: {
        scanCount:     user.scanCount || 0,
        totalReports:  total,
        openReports:   open,
        resolvedReports: resolved,
        safetyScore:   score,
        qrActive:      !!user.qrId && user.profileCompleted,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getByQrId, regenerateQR, getDashboardStats };
