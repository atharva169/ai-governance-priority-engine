const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { authenticate } = require("./auth/middleware");
const db = require("./db/connection");
const liveEngine = require("./engine/liveIngestionEngine");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id"]
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "ai-governance-backend" });
});

app.get("/health", async (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: db.isAvailable() ? "connected" : "disconnected",
    liveStream: liveEngine.getStats(),
  });
});

// Auth routes — NOT behind authenticate middleware
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Live stream route — uses its own x-user-id auth (SSE can't use Bearer headers)
const liveStreamRouter = require("./routes/liveStream");
app.use("/api/live-stream", liveStreamRouter);

// All other /api routes require authentication
app.use("/api", authenticate);

const issuesRouter = require("./routes/issues");
app.use("/api/issues", issuesRouter);

const commitmentsRouter = require("./routes/commitments");
app.use("/api/commitments", commitmentsRouter);

const briefsRouter = require("./routes/briefs");
app.use("/api/briefs", briefsRouter);

const askEngineRouter = require("./routes/askEngine");
app.use("/api/ask", askEngineRouter);

const auditRouter = require("./routes/audit");
app.use("/api/audit", auditRouter);

const sentimentRouter = require("./routes/sentiment");
app.use("/api/sentiment", sentimentRouter);

const zonesRouter = require("./routes/zones");
app.use("/api/zones", zonesRouter);

const simulationRouter = require("./routes/simulation");
app.use("/api/simulation", simulationRouter);

// ─── Startup ───
(async () => {
  // Initialize database (non-blocking — server starts even if DB is down)
  const dbConnected = await db.initialize();
  if (dbConnected) {
    console.log("✅ Database layer ready");
  } else {
    console.warn("⚠️  Running without database — using JSON file fallback");
  }

  // Start live ingestion engine
  liveEngine.startStream();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
})();

// ─── Graceful Shutdown ───
process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  liveEngine.stopStream();
  await db.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  liveEngine.stopStream();
  await db.close();
  process.exit(0);
});
