const express = require("express");
const cors = require("cors");
const { authenticate } = require("./auth/middleware");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "ai-governance-backend" });
});

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
