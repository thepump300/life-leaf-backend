const express = require("express");
const cors    = require("cors");

const authRoutes     = require("./routes/authRoutes");
const profileRoutes  = require("./routes/profileRoutes");
const qrRoutes       = require("./routes/qrRoutes");
const incidentRoutes = require("./routes/incidentRoutes");
const { protect }    = require("./middleware/authMiddleware");
const { getDashboardStats } = require("./controllers/qrController");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any vercel.app subdomain
    if (origin.endsWith(".vercel.app") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/profile",   profileRoutes);
app.use("/api/qr",        qrRoutes);
app.use("/api/incidents", incidentRoutes);

app.get("/api/dashboard/stats", protect, getDashboardStats);

// ── Health check ──────────────────────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "Life Leaf API is running" })
);

// ── 404 handler ───────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

module.exports = app;
