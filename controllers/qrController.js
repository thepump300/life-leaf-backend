const User = require("../models/User");

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

    res.json({
      success: true,
      data: { vehicleNumber: user.vehicleNumber },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getByQrId };
