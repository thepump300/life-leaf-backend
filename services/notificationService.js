/**
 * Notification Service
 * Currently mocked — replace sendSMS with a real provider (Twilio, MSG91, etc.)
 */

const sendSMS = async (phone, message) => {
  // TODO: Replace with real SMS provider
  console.log(`[SMS] → ${phone}: ${message}`);
};

/**
 * Sends an alert to emergency contacts when an incident is reported.
 * Phone numbers are used only for notification and never exposed via API.
 */
const sendIncidentAlert = async (user, incident) => {
  const typeLabel = incident.type === "accident" ? "ACCIDENT / EMERGENCY" : "PARKING ISSUE";
  const location  = incident.location || "Unknown location";
  const vehicle   = user.vehicleNumber || "Unknown vehicle";

  const message = `[Community Alert] ${typeLabel} reported for vehicle ${vehicle} at ${location}. Please respond if you are the owner.`;

  console.log(`\n[Notification] Incident reported:`);
  console.log(`  Type     : ${typeLabel}`);
  console.log(`  Vehicle  : ${vehicle}`);
  console.log(`  Location : ${location}`);
  console.log(`  Time     : ${incident.timestamp}`);

  const contacts = user.emergencyContacts || [];

  if (contacts.length === 0) {
    console.log(`  Contacts : None on file`);
    return;
  }

  for (const contact of contacts) {
    if (contact.phone) {
      await sendSMS(contact.phone, message);
    }
  }
};

module.exports = { sendIncidentAlert };
