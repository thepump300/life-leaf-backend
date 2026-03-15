const { sendEmail } = require("../utils/sendEmail");

const TYPE_LABELS = {
  parking:   "Parking Issue",
  accident:  "Accident / Emergency",
  lights_on: "Lights Left On",
  damage:    "Vehicle Damage Noticed",
};

const TYPE_COLORS = {
  parking:   "#F07028",
  accident:  "#ef4444",
  lights_on: "#FFB347",
  damage:    "#a78bfa",
};

/**
 * Sends email alerts to all emergency contacts when any incident is reported.
 * Called for all 4 incident types.
 */
const sendIncidentAlert = async (user, incident) => {
  const contacts = (user.emergencyContacts || []).filter(c => c.email);
  if (contacts.length === 0) return;

  const typeLabel   = TYPE_LABELS[incident.type] || incident.type;
  const accentColor = TYPE_COLORS[incident.type] || "#F07028";
  const isUrgent    = incident.type === "accident";
  const vehicle     = user.vehicleNumber || "Unknown";
  const location    = incident.location || "Unknown";

  const subject = isUrgent
    ? `🚨 URGENT: ${user.name || "Someone"}'s vehicle ${vehicle} was in an accident`
    : `[Community] ${typeLabel} reported for ${user.name || "a vehicle"} (${vehicle})`;

  const html = buildContactEmail({ user, incident, typeLabel, accentColor, isUrgent, vehicle, location });

  await Promise.allSettled(
    contacts.map(c => sendEmail(c.email, subject, html))
  );
};

const buildContactEmail = ({ user, incident, typeLabel, accentColor, isUrgent, vehicle, location }) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#07050f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#111018;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

    <div style="background:${isUrgent ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#FFB347,#F07028,#E8411A)"};padding:28px 32px;">
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Community — Emergency Contact Alert</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:900;">${isUrgent ? "🚨 " : ""}${typeLabel}</h1>
    </div>

    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;color:rgba(255,255,255,0.55);font-size:14px;line-height:1.6;">
        You are listed as an emergency contact for <strong style="color:#fff;">${user.name || "a Community user"}</strong>.
        An incident has been reported for their vehicle.
      </p>

      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:7px 0;color:rgba(255,255,255,0.35);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:110px;">Type</td>
            <td style="padding:7px 0;color:${accentColor};font-size:14px;font-weight:700;">${typeLabel}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:rgba(255,255,255,0.35);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Vehicle</td>
            <td style="padding:7px 0;color:#fff;font-size:14px;font-weight:700;letter-spacing:2px;">${vehicle}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:rgba(255,255,255,0.35);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Location</td>
            <td style="padding:7px 0;color:rgba(255,255,255,0.75);font-size:14px;">${location}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:rgba(255,255,255,0.35);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Time</td>
            <td style="padding:7px 0;color:rgba(255,255,255,0.75);font-size:14px;">${new Date(incident.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
          </tr>
          ${incident.note ? `
          <tr>
            <td style="padding:7px 0;color:rgba(255,255,255,0.35);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Note</td>
            <td style="padding:7px 0;color:rgba(255,255,255,0.75);font-size:14px;">${incident.note}</td>
          </tr>` : ""}
        </table>
      </div>

      ${isUrgent ? `
      <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;color:#ef4444;font-size:13px;font-weight:700;">⚠️ This is an emergency — please try reaching ${user.name || "the owner"} immediately. Call 112 if needed.</p>
      </div>` : ""}

      <p style="margin:0;color:rgba(255,255,255,0.3);font-size:11px;line-height:1.7;text-align:center;">
        You received this because you are listed as an emergency contact.<br/>
        The reporter's identity was not recorded.
      </p>
    </div>

    <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="margin:0;color:rgba(255,255,255,0.2);font-size:11px;text-align:center;">Community — Protecting vehicles, connecting communities.</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = { sendIncidentAlert };
