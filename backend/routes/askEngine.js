const express = require("express");
const { authorize, auditLog } = require("../auth/middleware");
const { loadGrievances, loadCommitments, loadMediaIssues } = require("../db/services");
const { handleQuery } = require("../engine/queryEngine");
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

/**
 * Filter commitments to those linked to grievances in the user's zone.
 */
function filterCommitmentsByZone(commitments, grievances, zone) {
    if (!zone) return commitments;
    const zoneGrievanceIds = grievances
        .filter((g) => g.region && g.region.includes(zone))
        .map((g) => g.id);
    return commitments.filter((c) =>
        c.linkedGrievanceIds &&
        c.linkedGrievanceIds.some((id) => zoneGrievanceIds.includes(id))
    );
}

// Admin + Officer + Leader can use the Ask Engine
// Data is filtered to the user's zone
router.post(
    "/",
    authorize("admin", "officer", "leader"),
    auditLog("ASK_QUERY"),
    async (req, res) => {
        try {
            const { query } = req.body;

            if (!query || typeof query !== "string") {
                return res.status(400).json({ error: "Missing or invalid query" });
            }

            const staticGrievances = await loadGrievances();
            const allCommitments = await loadCommitments();
            const mediaIssues = await loadMediaIssues();

            const allGrievances = mergeWithLive(staticGrievances);
            const zone = getUserZone(req.user);
            const grievances = filterByZone(allGrievances, zone);
            const commitments = filterCommitmentsByZone(allCommitments, allGrievances, zone);

            const result = await handleQuery(query, { grievances, commitments, mediaIssues });

            result.zone = zone || "All Delhi (City-wide)";
            result.user = req.user.name;
            result.role = req.user.role;

            res.json(result);
        } catch (err) {
            console.error("Ask engine route error:", err.message);
            res.status(500).json({ error: "Failed to process query" });
        }
    }
);

module.exports = router;
