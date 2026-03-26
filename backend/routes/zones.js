/**
 * Zone Intelligence Route — Deep-Dive Analytics for a Single Delhi Zone
 *
 * GET /api/zones/:zone — Returns comprehensive zone report:
 *   - Zone sentiment analysis (NLP trends, keywords)
 *   - All issues in the zone (ranked by priority)
 *   - Linked commitments
 *   - AI-generated conclusions
 */

const express = require("express");
const { authorize, auditLog } = require("../auth/middleware");
const { loadGrievances, loadCommitments, loadMediaIssues } = require("../db/services");
const { rankAllIssues } = require("../engine/scoringEngine");
const { analyzeSentiment, getZoneTrends, aggregateKeywords } = require("../engine/sentimentEngine");
const liveEngine = require("../engine/liveIngestionEngine");

const router = express.Router();

const VALID_ZONES = ["North Delhi", "South Delhi", "East Delhi", "West Delhi", "Central Delhi"];

/**
 * Generate AI conclusions for a zone based on its data.
 */
function generateZoneConclusions(zone, issues, commitments, sentimentData) {
    const conclusions = [];
    const n = issues.length;

    if (n === 0) {
        return [{ type: "info", text: `No active issues currently tracked in ${zone}.` }];
    }

    // 1. Overall severity assessment
    const criticalCount = issues.filter(i => i.label === "Critical").length;
    const avgScore = Math.round(issues.reduce((s, i) => s + i.score, 0) / n);

    if (criticalCount >= 3) {
        conclusions.push({
            type: "critical",
            text: `${zone} has ${criticalCount} critical issues out of ${n} total — this zone requires urgent governance intervention. Average priority score is ${avgScore}/100.`,
        });
    } else if (criticalCount > 0) {
        conclusions.push({
            type: "warning",
            text: `${zone} has ${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} among ${n} tracked. Average priority score: ${avgScore}/100.`,
        });
    } else {
        conclusions.push({
            type: "stable",
            text: `${zone} shows no critical issues. ${n} issues tracked with an average priority score of ${avgScore}/100.`,
        });
    }

    // 2. Top issue types
    const typeCount = {};
    issues.forEach(i => { typeCount[i.issueType] = (typeCount[i.issueType] || 0) + 1; });
    const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
    if (topType) {
        const typeLabels = {
            "life-safety": "life-safety threats",
            "essential-service": "essential service disruptions",
            "infrastructure": "infrastructure issues",
            "amenity": "amenity concerns",
        };
        conclusions.push({
            type: topType[0] === "life-safety" ? "critical" : "info",
            text: `Dominant issue type: ${typeLabels[topType[0]] || topType[0]} (${topType[1]} of ${n} issues). ${topType[0] === "life-safety" ? "These pose direct risk to human health and must be prioritized." : ""}`,
        });
    }

    // 3. Sentiment-based conclusion
    if (sentimentData && sentimentData.avgSeverity > 0) {
        const sentimentLabels = { 5: "extreme public outrage", 4: "significant anger", 3: "frustrated sentiment", 2: "mild concern", 1: "neutral sentiment" };
        const rounded = Math.round(sentimentData.avgSeverity);
        conclusions.push({
            type: rounded >= 4 ? "critical" : rounded >= 3 ? "warning" : "info",
            text: `NLP analysis detects ${sentimentLabels[rounded] || "unknown sentiment"} in ${zone} (severity: ${sentimentData.avgSeverity}/5).${sentimentData.trend === "rising" ? ` Public anger is RISING (+${sentimentData.changePercent}% this hour) — escalation risk is elevated.` : sentimentData.trend === "falling" ? ` Sentiment is improving (${sentimentData.changePercent}%).` : " Sentiment is stable."}`,
        });
    }

    // 4. Longest pending issue
    const longestPending = issues.reduce((a, b) => (a.daysPending > b.daysPending ? a : b));
    if (longestPending.daysPending >= 90) {
        conclusions.push({
            type: "warning",
            text: `Longest unresolved issue: "${longestPending.title}" has been pending for ${longestPending.daysPending} days — significantly beyond the 30-day standard response window.`,
        });
    }

    // 5. Commitment breaches
    const stalledCommitments = commitments.filter(c => c.status === "stalled" || c.status === "delayed");
    if (stalledCommitments.length > 0) {
        conclusions.push({
            type: "warning",
            text: `${stalledCommitments.length} government commitment${stalledCommitments.length > 1 ? "s are" : " is"} stalled or delayed in ${zone}. Unmet promises amplify public anger and escalation risk.`,
        });
    }

    // 6. Escalation risk
    const highEscalation = issues.filter(i => i.escalationRisk >= 4).length;
    if (highEscalation >= 2) {
        conclusions.push({
            type: "critical",
            text: `${highEscalation} issues have escalation risk level 4+. Political or legal escalation is likely if these remain unaddressed.`,
        });
    }

    // 7. Recommendation
    if (criticalCount > 0 || (sentimentData && sentimentData.avgSeverity >= 4)) {
        conclusions.push({
            type: "recommendation",
            text: `Recommended action: Deploy emergency response to ${zone}. Prioritize ${criticalCount > 0 ? "the " + criticalCount + " critical issues" : "high-anger areas"} and issue public communication to demonstrate awareness of citizen concerns.`,
        });
    } else {
        conclusions.push({
            type: "recommendation",
            text: `Recommended action: Continue routine monitoring of ${zone}. Schedule follow-ups on pending issues exceeding 60 days and track commitment delivery timelines.`,
        });
    }

    return conclusions;
}

// GET /api/zones/:zone — Zone intelligence report
router.get(
    "/:zone",
    authorize("admin", "officer"),
    auditLog("VIEW_ZONE_INTELLIGENCE"),
    async (req, res) => {
        try {
            const zone = decodeURIComponent(req.params.zone);

            if (!VALID_ZONES.includes(zone)) {
                return res.status(400).json({
                    error: `Invalid zone. Valid zones: ${VALID_ZONES.join(", ")}`,
                });
            }

            // Load all data
            const staticGrievances = await loadGrievances();
            const mediaIssues = await loadMediaIssues();
            const allCommitments = await loadCommitments();

            // Merge with live grievances
            const liveGrievances = liveEngine.getLiveGrievances();
            const existingIds = new Set(staticGrievances.map(g => g.id));
            const uniqueLive = liveGrievances.filter(g => !existingIds.has(g.id));
            const allGrievances = [...staticGrievances, ...uniqueLive];

            // Filter to this zone
            const zoneGrievances = allGrievances.filter(
                g => g.region && g.region.includes(zone)
            );

            // Rank zone issues
            const rankedIssues = rankAllIssues(zoneGrievances, { mediaIssues, commitments: allCommitments });

            // Filter commitments linked to this zone
            const zoneGrievanceIds = zoneGrievances.map(g => g.id);
            const zoneCommitments = allCommitments.filter(c => {
                if (c.region && c.region.includes(zone)) return true;
                if (c.linkedGrievanceIds && c.linkedGrievanceIds.some(id => zoneGrievanceIds.includes(id))) return true;
                return false;
            });

            // Get sentiment trends for this zone
            const allTrends = getZoneTrends();
            const zoneSentiment = allTrends.zones.find(z => z.zone === zone) || null;

            // NLP analysis of zone grievances (re-analyze for fresh keywords)
            const zoneKeywords = [];
            const sentimentBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

            for (const g of zoneGrievances) {
                const nlp = analyzeSentiment(g.description);
                if (nlp.keywords.length > 0) zoneKeywords.push(nlp.keywords);
                sentimentBreakdown[nlp.severity] = (sentimentBreakdown[nlp.severity] || 0) + 1;
            }

            const topKeywords = aggregateKeywords(zoneKeywords);

            // Generate AI conclusions
            const conclusions = generateZoneConclusions(zone, rankedIssues, zoneCommitments, zoneSentiment);

            // Compute zone stats
            const scores = rankedIssues.map(i => i.score);
            const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

            res.json({
                zone,
                summary: {
                    totalIssues: rankedIssues.length,
                    criticalCount: rankedIssues.filter(i => i.label === "Critical").length,
                    attentionCount: rankedIssues.filter(i => i.label === "Attention Required").length,
                    stableCount: rankedIssues.filter(i => i.label === "Stable").length,
                    avgScore,
                    maxScore,
                    lifeSafetyCount: rankedIssues.filter(i => i.issueType === "life-safety").length,
                    highEscalationCount: rankedIssues.filter(i => i.escalationRisk >= 4).length,
                },
                sentiment: {
                    zone: zoneSentiment,
                    breakdown: sentimentBreakdown,
                    topKeywords,
                },
                issues: rankedIssues,
                commitments: zoneCommitments.map(c => ({
                    ...c,
                    delaySeverity: c.daysPending >= 180 ? "high" : c.daysPending >= 90 ? "medium" : "low",
                })),
                conclusions,
                generatedAt: new Date().toISOString(),
            });
        } catch (err) {
            console.error("Zone intelligence route error:", err.message);
            res.status(500).json({ error: "Failed to generate zone intelligence" });
        }
    }
);

module.exports = router;
