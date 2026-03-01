const express = require("express");
const { authorize, auditLog } = require("../auth/middleware");
const { loadJSON } = require("../utils/dataLoader");

const router = express.Router();

function getDelaySeverity(daysPending) {
    if (daysPending >= 180) return "high";
    if (daysPending >= 90) return "medium";
    return "low";
}

/**
 * Extract the user's zone keyword from their constituencyName.
 */
function getUserZone(user) {
    if (!user || !user.constituencyName) return null;
    if (user.constituencyName === "All Delhi") return null;
    return user.constituencyName;
}

/**
 * Filter commitments to those linked to grievances in the user's zone.
 */
function filterCommitmentsByZone(commitments, grievances, zone) {
    if (!zone) return commitments; // admin/leader with "All Delhi"

    // Find grievance IDs in the user's zone
    const zoneGrievanceIds = grievances
        .filter((g) => g.region && g.region.includes(zone))
        .map((g) => g.id);

    return commitments.filter((c) =>
        c.linkedGrievanceIds &&
        c.linkedGrievanceIds.some((id) => zoneGrievanceIds.includes(id))
    );
}

// Admin + Leader: all commitments | Officer: filtered to their zone's linked grievances
router.get(
    "/",
    authorize("admin", "officer", "leader"),
    auditLog("VIEW_COMMITMENTS"),
    (req, res) => {
        const commitments = loadJSON("commitments.json");
        const grievances = loadJSON("grievances.json");

        const zone = getUserZone(req.user);
        const filtered = filterCommitmentsByZone(commitments, grievances, zone);

        const enriched = filtered
            .map((commitment) => ({
                ...commitment,
                delaySeverity: getDelaySeverity(commitment.daysPending),
            }))
            .sort((a, b) => b.daysPending - a.daysPending);

        res.json({ count: enriched.length, commitments: enriched });
    }
);

module.exports = router;
