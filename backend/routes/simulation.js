const express = require("express");
const { authorize } = require("../auth/middleware");
const { loadJSON } = require("../utils/dataLoader");
const { simulateDaysElapsed } = require("../engine/simulationEngine");

const router = express.Router();

// In-memory store of last login timestamps per user ID.
// In production this would be in a database.
const lastLoginStore = new Map();

/**
 * POST /api/simulation/record-login
 * Called by frontend right after login to record the current timestamp.
 * Returns the number of days since the user's previous login.
 */
router.post(
    "/record-login",
    authorize("admin", "officer", "leader"),
    (req, res) => {
        const userId = req.user.id;
        const now = Date.now();
        const previousLogin = lastLoginStore.get(userId);

        let daysAway = 0;
        if (previousLogin) {
            daysAway = Math.max(2, Math.floor((now - previousLogin) / (1000 * 60 * 60 * 24))); // Always at least 2 for demo
        } else {
            // First time? Simulate 2 days for demo purposes
            daysAway = 2;
        }

        lastLoginStore.set(userId, now);
        res.json({ daysAway });
    }
);

/**
 * GET /api/simulation/changes?daysAway=N
 * Returns "What Changed?" report for N days of elapsed time.
 * Called by the dashboard on mount.
 */
router.get(
    "/changes",
    authorize("admin", "officer", "leader"),
    (req, res) => {
        const daysAway = parseInt(req.query.daysAway) || 0;

        const grievances = loadJSON("grievances.json");
        const mediaIssues = loadJSON("media-issues.json");
        const commitments = loadJSON("commitments.json");

        const report = simulateDaysElapsed(daysAway, grievances, mediaIssues, commitments);
        res.json(report);
    }
);

module.exports = router;
