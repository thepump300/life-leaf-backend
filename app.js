const express = require("express");
const cors    = require("cors");

const authRoutes     = require("./routes/authRoutes");
const profileRoutes  = require("./routes/profileRoutes");
const qrRoutes       = require("./routes/qrRoutes");
const incidentRoutes = require("./routes/incidentRoutes");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/profile",   profileRoutes);
app.use("/api/qr",        qrRoutes);
app.use("/api/incidents", incidentRoutes);

// ── Health check ──────────────────────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "Life Leaf API is running" })
);

// ── 404 handler ───────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

module.exports = app;
