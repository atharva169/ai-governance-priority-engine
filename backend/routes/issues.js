const express = require("express");
const { authorize, auditLog } = require("../auth/middleware");
const { loadGrievances, loadCommitments, loadMediaIssues } = require("../db/services");
const { rankAllIssues } = require("../engine/scoringEngine");
const { computeStatistics } = require("../engine/statisticsEngine");
const liveEngine = require("../engine/liveIngestionEngine");

const router = express.Router();

/**
 * Extract the user's zone keyword from their constituencyName.
 */
function getUserZone(user) {
    if (!user || !user.constituencyName) return null;
    if (user.constituencyName === "All Delhi") return null;
    return user.constituencyName;
}

/**
 * Filter grievances to those whose region contains the user's zone name.
 */
function filterByZone(grievances, zone) {
    if (!zone) return grievances;
    return grievances.filter((g) => g.region && g.region.includes(zone));
}

/**
 * Merge static grievances with live-generated ones (deduped by ID).
 */
function mergeWithLive(staticGrievances) {
    const liveGrievances = liveEngine.getLiveGrievances();
    const existingIds = new Set(staticGrievances.map((g) => g.id));
    const uniqueLive = liveGrievances.filter((g) => !existingIds.has(g.id));
    return [...staticGrievances, ...uniqueLive];
}

// GET /api/issues — Returns issues ranked by AI priority engine
router.get(
    "/",
    authorize("admin", "officer"),
    auditLog("VIEW_ISSUES"),
    async (req, res) => {
        try {
            const staticGrievances = await loadGrievances();
            const mediaIssues = await loadMediaIssues();
            const commitments = await loadCommitments();

            const allGrievances = mergeWithLive(staticGrievances);
            const zone = getUserZone(req.user);
            const filtered = filterByZone(allGrievances, zone);

            const ranked = rankAllIssues(filtered, { mediaIssues, commitments });

            res.json({ count: ranked.length, issues: ranked });
        } catch (err) {
            console.error("Issues route error:", err.message);
            res.status(500).json({ error: "Failed to load issues" });
        }
    }
);

// GET /api/issues/statistics — Returns full statistical analysis
router.get(
    "/statistics",
    authorize("admin", "officer"),
    auditLog("VIEW_STATISTICS"),
    async (req, res) => {
        try {
            const staticGrievances = await loadGrievances();
            const mediaIssues = await loadMediaIssues();
            const commitments = await loadCommitments();

            const allGrievances = mergeWithLive(staticGrievances);
            const zone = getUserZone(req.user);
            const filtered = filterByZone(allGrievances, zone);

            const stats = computeStatistics(filtered, { mediaIssues, commitments });

            const { ranked, ...statisticsOnly } = stats;

            res.json(statisticsOnly);
        } catch (err) {
            console.error("Statistics route error:", err.message);
            res.status(500).json({ error: "Failed to load statistics" });
        }
    }
);

module.exports = router;
