const express = require("express");
const { authorize, auditLog } = require("../auth/middleware");
const { loadJSON } = require("../utils/dataLoader");
const { handleQuery } = require("../engine/queryEngine");

const router = express.Router();

router.post(
    "/",
    authorize("admin", "officer"),
    auditLog("ASK_QUERY"),
    (req, res) => {
        const { query } = req.body;

        if (!query || typeof query !== "string") {
            return res.status(400).json({ error: "Missing or invalid query" });
        }

        const grievances = loadJSON("grievances.json");
        const commitments = loadJSON("commitments.json");

        const result = handleQuery(query, { grievances, commitments });

        res.json(result);
    }
);

module.exports = router;
