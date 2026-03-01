const express = require("express");
const { authorize, auditLog } = require("../auth/middleware");
const { loadJSON } = require("../utils/dataLoader");
const { rankAllIssues } = require("../engine/scoringEngine");
const { computeStatistics } = require("../engine/statisticsEngine");

const router = express.Router();

/**
 * Extract the user's zone keyword from their constituencyName.
 * e.g., "East Delhi" → "East Delhi", "All Delhi" → null (admin sees all)
 */
function getUserZone(user) {
    if (!user || !user.constituencyName) return null;
    if (user.constituencyName === "All Delhi") return null; // admin sees everything
    return user.constituencyName; // e.g., "East Delhi", "North Delhi"
}

/**
 * Filter grievances to those whose region contains the user's zone name.
 * e.g., zone "East Delhi" matches region "Laxmi Nagar, East Delhi"
 */
function filterByZone(grievances, zone) {
    if (!zone) return grievances; // no filter for admin
    return grievances.filter((g) => g.region && g.region.includes(zone));
}

// GET /api/issues — Returns issues ranked by AI priority engine
// Admin: all issues | Officer: filtered to their zone
router.get(
    "/",
    authorize("admin", "officer"),
    auditLog("VIEW_ISSUES"),
    (req, res) => {
        const grievances = loadJSON("grievances.json");
        const mediaIssues = loadJSON("media-issues.json");
        const commitments = loadJSON("commitments.json");

        const zone = getUserZone(req.user);
        const filtered = filterByZone(grievances, zone);

        const ranked = rankAllIssues(filtered, { mediaIssues, commitments });

        res.json({ count: ranked.length, issues: ranked });
    }
);

// GET /api/issues/statistics — Returns full statistical analysis
// Admin: all issues | Officer: filtered to their zone
router.get(
    "/statistics",
    authorize("admin", "officer"),
    auditLog("VIEW_STATISTICS"),
    (req, res) => {
        const grievances = loadJSON("grievances.json");
        const mediaIssues = loadJSON("media-issues.json");
        const commitments = loadJSON("commitments.json");

        const zone = getUserZone(req.user);
        const filtered = filterByZone(grievances, zone);

        const stats = computeStatistics(filtered, { mediaIssues, commitments });

        // Don't send full ranked list in statistics response (it's in /api/issues)
        const { ranked, ...statisticsOnly } = stats;

        res.json(statisticsOnly);
    }
);

module.exports = router;
