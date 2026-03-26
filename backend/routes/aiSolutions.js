const express = require("express");
const { authorize, auditLog } = require("../auth/middleware");
const { loadGrievances, loadCommitments, loadMediaIssues } = require("../db/services");
const { rankAllIssues } = require("../engine/scoringEngine");
const { generateIssueSolution } = require("../engine/geminiEngine");
const liveEngine = require("../engine/liveIngestionEngine");

/**
 * Merge static grievances with live-generated ones (deduped by ID).
 */
function mergeWithLive(staticGrievances) {
    const liveGrievances = liveEngine.getLiveGrievances();
    const existingIds = new Set(staticGrievances.map((g) => g.id));
    const uniqueLive = liveGrievances.filter((g) => !existingIds.has(g.id));
    return [...staticGrievances, ...uniqueLive];
}

const router = express.Router();

/**
 * POST /api/ai-solution
 *
 * Generates an AI-powered solution analysis for a specific governance issue.
 * Uses the Gemini engine with triple-layer fallback.
 */
router.post(
    "/",
    authorize("admin", "officer", "leader"),
    auditLog("AI_SOLUTION_REQUEST"),
    async (req, res) => {
        try {
            const { issueId, issueTitle, issueScore } = req.body;

            if (!issueId || typeof issueId !== "string") {
                return res.status(400).json({ error: "Missing or invalid issueId" });
            }

            // Load and rank all issues (including live-generated) to get full scored data
            const grievances = await loadGrievances();
            const commitments = await loadCommitments();
            const mediaIssues = await loadMediaIssues();

            const allGrievances = mergeWithLive(grievances);
            const ranked = rankAllIssues(allGrievances, { mediaIssues, commitments });

            // Find the specific issue — or build a minimal issue object from request data
            let issue = ranked.find((r) => r.id === issueId);

            if (!issue) {
                // Fallback for live-generated or unranked issues — use request data
                issue = {
                    id: issueId,
                    title: issueTitle || issueId,
                    score: issueScore || 50,
                    category: "General",
                    issueType: "general",
                    region: "Delhi",
                    daysPending: 30,
                    complaintsCount: 10,
                    explanation: "Live-generated grievance requiring AI analysis",
                };
            }

            // Generate AI solution (triple-layer fallback handles API failures)
            const solution = await generateIssueSolution(issue);

            res.json({
                issueId: issue.id,
                issueTitle: issue.title,
                issueScore: issue.score,
                issueRegion: issue.region,
                solution,
                generatedAt: new Date().toISOString(),
            });
        } catch (err) {
            console.error("[AI Solution Route] Error:", err.message);
            res.status(500).json({ error: "Failed to generate AI solution" });
        }
    }
);

module.exports = router;
