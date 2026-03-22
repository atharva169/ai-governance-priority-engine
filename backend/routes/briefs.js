const express = require("express");
const { authorize, auditLog } = require("../auth/middleware");
const { loadGrievances, loadCommitments, loadMediaIssues } = require("../db/services");
const { loadJSON } = require("../utils/dataLoader");
const { generateBrief } = require("../engine/briefsEngine");

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

// Admin: full brief across all zones | Leader: brief filtered to their zone
router.get(
    "/",
    authorize("admin", "leader"),
    auditLog("VIEW_BRIEF"),
    async (req, res) => {
        try {
            const allGrievances = await loadGrievances();
            const allCommitments = await loadCommitments();
            const mediaIssues = await loadMediaIssues();
            const internalReports = loadJSON("internal-reports.json");

            const zone = getUserZone(req.user);
            const grievances = filterByZone(allGrievances, zone);
            const commitments = filterCommitmentsByZone(allCommitments, allGrievances, zone);

            const brief = generateBrief({ grievances, commitments, mediaIssues, internalReports });

            res.json(brief);
        } catch (err) {
            console.error("Briefs route error:", err.message);
            res.status(500).json({ error: "Failed to generate brief" });
        }
    }
);

module.exports = router;
