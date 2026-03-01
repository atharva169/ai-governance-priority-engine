const { rankAllIssues } = require("./scoringEngine");

function generateBrief({ grievances, commitments, mediaIssues = [], internalReports = [] }) {
    const ranked = rankAllIssues(grievances, { mediaIssues, commitments });

    // Top critical issues
    const topCriticalIssues = ranked
        .filter((issue) => issue.label === "Critical")
        .slice(0, 5)
        .map((issue) => ({
            id: issue.id,
            rank: issue.rank,
            title: issue.title,
            score: issue.score,
            region: issue.region,
            category: issue.category,
            issueType: issue.issueType,
            explanation: issue.explanation,
            aiReasoning: issue.aiReasoning,
            daysPending: issue.daysPending,
            complaintsCount: issue.complaintsCount,
        }));

    // Most delayed commitments with internal report context
    const mostDelayedCommitments = [...commitments]
        .sort((a, b) => b.daysPending - a.daysPending)
        .slice(0, 3)
        .map((commitment) => {
            const report = internalReports.find(
                (r) => r.relatedCommitmentIds && r.relatedCommitmentIds.includes(commitment.id)
            );
            return {
                ...commitment,
                internalReport: report ? report.summary : null,
                department: report ? report.department : null,
            };
        });

    // High escalation risks
    const highEscalationRisks = ranked
        .filter((issue) => issue.escalationRisk >= 4 || issue.publicVisibility >= 4)
        .slice(0, 5)
        .map((issue) => ({
            id: issue.id,
            rank: issue.rank,
            title: issue.title,
            score: issue.score,
            escalationRisk: issue.escalationRisk,
            publicVisibility: issue.publicVisibility,
            region: issue.region,
        }));

    // Compute quick stats for the summary
    const scores = ranked.map((r) => r.score);
    const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    const criticalCount = ranked.filter((r) => r.label === "Critical").length;
    const lifeSafetyCount = ranked.filter((r) => r.issueType === "life-safety").length;
    const healthScore = Math.round(Math.max(0, 100 - avgScore * 1.2));

    const executiveSummary = buildExecutiveSummary({
        ranked,
        topCriticalIssues,
        mostDelayedCommitments,
        highEscalationRisks,
        avgScore,
        criticalCount,
        lifeSafetyCount,
        healthScore,
    });

    return {
        generatedAt: new Date().toISOString(),
        governanceHealthScore: healthScore,
        topCriticalIssues,
        mostDelayedCommitments,
        highEscalationRisks,
        executiveSummary,
        quickStats: {
            totalIssues: ranked.length,
            criticalCount,
            lifeSafetyCount,
            avgPriorityScore: avgScore,
            highestScore: scores.length > 0 ? Math.max(...scores) : 0,
            longestPending: ranked.length > 0 ? Math.max(...ranked.map((r) => r.daysPending)) : 0,
        },
    };
}

function buildExecutiveSummary({
    ranked,
    topCriticalIssues,
    mostDelayedCommitments,
    highEscalationRisks,
    avgScore,
    criticalCount,
    lifeSafetyCount,
    healthScore,
}) {
    const points = [];

    // Governance health context
    const healthLabel = healthScore >= 70 ? "stable" : healthScore >= 45 ? "under strain" : "critical";
    points.push({
        title: "GOVERNANCE HEALTH",
        content: `${healthScore}/100 (${healthLabel}). The AI Priority Engine has analyzed ${ranked.length} active governance issues across multiple categories.`,
    });

    // Critical issues
    if (criticalCount > 0) {
        points.push({
            title: "CRITICAL ITEMS",
            content: `${criticalCount} issue${criticalCount > 1 ? "s" : ""} classified as Critical (score ≥65/100), requiring immediate escalation.`,
        });
    }

    // Life-safety alert
    if (lifeSafetyCount > 0) {
        points.push({
            title: "LIFE-SAFETY ALERT",
            content: `${lifeSafetyCount} active issue${lifeSafetyCount > 1 ? "s" : ""} classified as direct threats to human health or safety. These have been automatically elevated by the priority engine.`,
        });
    }

    // Top priority
    if (topCriticalIssues.length > 0) {
        const top = topCriticalIssues[0];
        points.push({
            title: "HIGHEST PRIORITY",
            content: `"${top.title}" (Score: ${top.score}/100, Rank #${top.rank}) — ${top.complaintsCount} complaints filed, pending ${top.daysPending} days in ${top.region}.`,
        });
    }

    // Commitment delays
    if (mostDelayedCommitments.length > 0) {
        const maxDelay = mostDelayedCommitments[0].daysPending;
        points.push({
            title: "COMMITMENT TRACKER",
            content: `The most delayed public commitment has been pending for ${maxDelay} days. ${mostDelayedCommitments.filter((c) => c.daysPending > 180).length} commitment(s) exceed the 180-day threshold.`,
        });
    }

    // Statistical context
    points.push({
        title: "STATISTICAL CONTEXT",
        content: `Average priority score is ${avgScore}/100. ${highEscalationRisks.length} issue(s) exhibit elevated escalation risk or high public visibility.`,
    });

    points.push({
        title: "SYSTEM NOTE",
        content: "This brief is auto-generated by the AI Priority Engine from current data and does not constitute policy guidance.",
    });

    return points;
}

module.exports = { generateBrief };
