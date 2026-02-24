const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "ai-governance-backend" });
});

// Future route modules will be mounted under /api

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
