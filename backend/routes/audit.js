const express = require("express");
const { authorize, auditLog, auditLogs } = require("../auth/middleware");

const router = express.Router();

router.get(
    "/",
    authorize("admin"),
    auditLog("VIEW_AUDIT_LOGS"),
    (req, res) => {
        res.json({ count: auditLogs.length, logs: auditLogs });
    }
);

module.exports = router;
