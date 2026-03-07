const User                    = require("../models/User");
const Incident                = require("../models/Incident");
const { sendIncidentAlert }   = require("../services/notificationService");

// POST /api/incidents/report  — public, no auth required
const reportIncident = async (req, res) => {
  try {
    const { qrId, type, location, timestamp } = req.body;

    if (!qrId || !type) {
      return res.status(400).json({ success: false, message: "qrId and type are required" });
    }

    if (!["parking", "accident"].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'parking' or 'accident'" });
    }

    // Find owner by qrId — select only what notification needs, never expose in response
    const user = await User.findOne({ qrId }).select("vehicleNumber emergencyContacts");

    if (!user) {
      return res.status(404).json({ success: false, message: "QR code not found" });
    }

    const incident = await Incident.create({
      userId:    user._id,
      type,
      location:  location || "Unknown",
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    // Increment scan count on the owner's record
    User.findByIdAndUpdate(user._id, { $inc: { scanCount: 1 } }).catch(() => {});

    // Fire-and-forget notification (doesn't block response)
    sendIncidentAlert(user, incident).catch((err) =>
      console.error("[Notification Error]", err.message)
    );

    res.status(201).json({
      success: true,
      message: "Incident reported successfully",
      incidentId: incident._id,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/incidents/my  — protected, returns logged-in user's incidents
const getMyIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50)
      .select("type location timestamp status createdAt");

    res.json({ success: true, incidents });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /api/incidents/:id/resolve  — protected
const resolveIncident = async (req, res) => {
  try {
    const incident = await Incident.findOne({ _id: req.params.id, userId: req.user.id });
    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }
    if (incident.status === "resolved") {
      return res.status(400).json({ success: false, message: "Already resolved" });
    }

    incident.status = "resolved";
    await incident.save();

    res.json({ success: true, message: "Marked as resolved", incident });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { reportIncident, getMyIncidents, resolveIncident };
