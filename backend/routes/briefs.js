const express = require("express");
const { authorize, auditLog } = require("../auth/middleware");
const { loadJSON } = require("../utils/dataLoader");
const { generateBrief } = require("../engine/briefsEngine");

const router = express.Router();

router.get(
    "/",
    authorize("admin", "leader"),
    auditLog("VIEW_BRIEF"),
    (req, res) => {
        const grievances = loadJSON("grievances.json");
        const commitments = loadJSON("commitments.json");

        const brief = generateBrief({ grievances, commitments });

        res.json(brief);
    }
);

module.exports = router;
