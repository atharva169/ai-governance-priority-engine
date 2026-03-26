/**
 * Sentiment Analytics Route
 *
 * GET /api/sentiment — Returns zone-level sentiment trends, global overview,
 *                      and top anger keywords from NLP analysis.
 */

const express = require("express");
const { authorize, auditLog } = require("../auth/middleware");
const { getZoneTrends, aggregateKeywords } = require("../engine/sentimentEngine");
const liveEngine = require("../engine/liveIngestionEngine");

const router = express.Router();

// GET /api/sentiment — Zone-level sentiment trends + global overview
router.get(
    "/",
    authorize("admin", "officer"),
    auditLog("VIEW_SENTIMENT"),
    (req, res) => {
        try {
            const trends = getZoneTrends();

            // Gather keywords from recent live grievances
            const recentKeywords = liveEngine.getRecentSentimentKeywords
                ? liveEngine.getRecentSentimentKeywords()
                : [];
            const topKeywords = aggregateKeywords(recentKeywords);

            res.json({
                ...trends,
                topKeywords,
                generatedAt: new Date().toISOString(),
            });
        } catch (err) {
            console.error("Sentiment route error:", err.message);
            res.status(500).json({ error: "Failed to load sentiment data" });
        }
    }
);

module.exports = router;
