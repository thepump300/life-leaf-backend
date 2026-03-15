const User                    = require("../models/User");
const Incident                = require("../models/Incident");
const { sendIncidentAlert }   = require("../services/notificationService");
const { sendEmail }           = require("../utils/sendEmail");

const VALID_TYPES = ["parking", "accident", "lights_on", "damage"];

const TYPE_LABELS = {
  parking:   "Parking Issue",
  accident:  "Accident / Emergency",
  lights_on: "Lights Left On",
  damage:    "Vehicle Damage Noticed",
};

// POST /api/incidents/report  — public, no auth required
const reportIncident = async (req, res) => {
  try {
    const { qrId, type, location, timestamp, note } = req.body;

    if (!qrId || !type) {
      return res.status(400).json({ success: false, message: "qrId and type are required" });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${VALID_TYPES.join(", ")}`,
      });
    }

    // Find owner — select only what notification needs, never expose in response
    const user = await User.findOne({ qrId }).select("vehicleNumber emergencyContacts email name phone");

    if (!user) {
      return res.status(404).json({ success: false, message: "QR code not found" });
    }

    const incident = await Incident.create({
      userId:    user._id,
      type,
      location:  location || "Unknown",
      note:      note || "",
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    // Increment scan count
    User.findByIdAndUpdate(user._id, { $inc: { scanCount: 1 } }).catch(() => {});

    // Fire-and-forget: SMS to emergency contacts
    sendIncidentAlert(user, incident).catch((err) =>
      console.error("[SMS Notification Error]", err.message)
    );

    // Fire-and-forget: Email to owner
    sendOwnerEmail(user, incident).catch((err) =>
      console.error("[Email Notification Error]", err.message)
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

// Send a rich HTML email to the vehicle owner
const sendOwnerEmail = async (user, incident) => {
  if (!user.email) return;

  const typeLabel = TYPE_LABELS[incident.type] || incident.type;
  const isUrgent  = incident.type === "accident";
  const accentColor = isUrgent ? "#ef4444" : "#F07028";

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
    <body style="margin:0;padding:0;background:#07050f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:#111018;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#FFB347,#F07028,#E8411A);padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Community Alert</p>
          <h1 style="margin:6px 0 0;color:#fff;font-size:24px;font-weight:900;">${isUrgent ? "🚨 " : ""}${typeLabel}</h1>
        </div>

        <!-- Body -->
        <div style="padding:28px 32px;">
          <p style="margin:0 0 20px;color:rgba(255,255,255,0.55);font-size:14px;line-height:1.6;">
            Hi <strong style="color:#fff;">${user.name}</strong>, someone reported an incident for your vehicle.
          </p>

          <!-- Details -->
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;margin-bottom:20px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:7px 0;color:rgba(255,255,255,0.35);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:110px;">Type</td>
                <td style="padding:7px 0;color:${accentColor};font-size:14px;font-weight:700;">${typeLabel}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;color:rgba(255,255,255,0.35);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Vehicle</td>
                <td style="padding:7px 0;color:#fff;font-size:14px;font-weight:700;letter-spacing:2px;">${user.vehicleNumber}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;color:rgba(255,255,255,0.35);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Location</td>
                <td style="padding:7px 0;color:rgba(255,255,255,0.75);font-size:14px;">${incident.location || "Unknown"}</td>
              </tr>
              <tr>
                <td style="padding:7px 0;color:rgba(255,255,255,0.35);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Time</td>
                <td style="padding:7px 0;color:rgba(255,255,255,0.75);font-size:14px;">${new Date(incident.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
              </tr>
              ${incident.note ? `<tr>
                <td style="padding:7px 0;color:rgba(255,255,255,0.35);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Note</td>
                <td style="padding:7px 0;color:rgba(255,255,255,0.75);font-size:14px;">${incident.note}</td>
              </tr>` : ""}
            </table>
          </div>

          ${isUrgent ? `
          <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:14px 18px;margin-bottom:20px;">
            <p style="margin:0;color:#ef4444;font-size:13px;font-weight:700;">⚠️ Emergency reported — please act immediately. Call 112 if needed.</p>
          </div>` : ""}

          <p style="margin:0;color:rgba(255,255,255,0.3);font-size:11px;line-height:1.7;text-align:center;">
            Log in to your Community dashboard to view and resolve this incident.<br/>
            The reporter's identity was not recorded — only the location was shared.
          </p>
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;text-align:center;">Community — Protecting vehicles, connecting communities.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const subject = isUrgent
    ? `🚨 URGENT: Accident reported for ${user.vehicleNumber}`
    : `[Community] ${typeLabel} reported for ${user.vehicleNumber}`;

  await sendEmail(user.email, subject, html);
};

// GET /api/incidents/my  — protected
const getMyIncidents = async (req, res) => {
  try {
    const incidents = await Incident.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50)
      .select("type location note timestamp status createdAt");

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
