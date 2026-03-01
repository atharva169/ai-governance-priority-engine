const express = require("express");
const { authorize, auditLog } = require("../auth/middleware");
const { loadJSON } = require("../utils/dataLoader");
const { handleQuery } = require("../engine/queryEngine");

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

// Admin + Officer + Leader can use the Ask Engine
// Data is filtered to the user's zone
router.post(
    "/",
    authorize("admin", "officer", "leader"),
    auditLog("ASK_QUERY"),
    (req, res) => {
        const { query } = req.body;

        if (!query || typeof query !== "string") {
            return res.status(400).json({ error: "Missing or invalid query" });
        }

        const allGrievances = loadJSON("grievances.json");
        const allCommitments = loadJSON("commitments.json");
        const mediaIssues = loadJSON("media-issues.json");

        const zone = getUserZone(req.user);
        const grievances = filterByZone(allGrievances, zone);
        const commitments = filterCommitmentsByZone(allCommitments, allGrievances, zone);

        const result = handleQuery(query, { grievances, commitments, mediaIssues });

        // Attach zone context to the response
        result.zone = zone || "All Delhi (City-wide)";
        result.user = req.user.name;
        result.role = req.user.role;

        res.json(result);
    }
);

module.exports = router;
