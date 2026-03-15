const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["parking", "accident", "lights_on", "damage"],
      required: [true, "Incident type is required"],
    },
    location: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Incident", incidentSchema);
