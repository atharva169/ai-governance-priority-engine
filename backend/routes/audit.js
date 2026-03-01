const express = require("express");
const { authorize, auditLog, auditLogs, generateSeedData } = require("../auth/middleware");

const router = express.Router();

router.get(
    "/",
    authorize("admin"),
    auditLog("VIEW_AUDIT_LOGS"),
    (req, res) => {
        // Regenerate seed data + keep any real entries (those with IP "::1" or "::ffff:")
        const realEntries = auditLogs.filter(
            (l) => l.ip && (l.ip.includes("::") || l.ip === "unknown")
        );
        const freshSeed = generateSeedData();
        const combined = [...freshSeed, ...realEntries].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        res.json({ count: combined.length, logs: combined });
    }
);

module.exports = router;
