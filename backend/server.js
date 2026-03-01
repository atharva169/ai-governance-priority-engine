const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { authenticate } = require("./auth/middleware");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: "*"
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "ai-governance-backend" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Auth routes — NOT behind authenticate middleware
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

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

const simulationRouter = require("./routes/simulation");
app.use("/api/simulation", simulationRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS Allowed Origin: ${allowedOrigin}`);
});
