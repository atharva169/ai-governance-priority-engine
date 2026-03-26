const { rankAllIssues } = require("./scoringEngine");
const { generateAIInsight } = require("./geminiEngine");

const QUERY_PATTERNS = [
    {
        keywords: ["urgent", "attention", "today", "critical"],
        intent: "URGENT_ATTENTION",
    },
    {
        keywords: ["commitments", "overdue", "delayed", "pending"],
        intent: "OVERDUE_COMMITMENTS",
    },
    {
        keywords: ["escalate", "escalation", "likely to escalate", "risk"],
        intent: "ESCALATION_RISK",
    },
];

function matchIntent(query) {
    const normalized = query.toLowerCase().trim();

    for (const pattern of QUERY_PATTERNS) {
        const matched = pattern.keywords.some((kw) => normalized.includes(kw));
        if (matched) return pattern.intent;
    }

    return null;
}

/**
 * Build a data context summary for Gemini from the ranked issues and commitments.
 */
function buildDataContext(ranked, commitments) {
    const criticalCount = ranked.filter((r) => r.label === "Critical").length;
    const lifeSafetyCount = ranked.filter((r) => r.issueType === "life-safety").length;
    const scores = ranked.map((r) => r.score);
    const avgScore = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;

    // Top categories by count
    const catCounts = {};
    ranked.forEach((r) => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
    const topCategories = Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => `${cat} (${count})`)
        .join(", ");

    // Most affected zones
    const zoneCounts = {};
    ranked.forEach((r) => {
        const zone = r.region?.split(",").pop()?.trim() || "Unknown";
        zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    });
    const mostAffectedZones = Object.entries(zoneCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([zone, count]) => `${zone} (${count} issues)`)
        .join(", ");

    const longestPending = ranked.length > 0 ? Math.max(...ranked.map((r) => r.daysPending || 0)) : 0;
    const overdueCommitments = commitments.filter((c) => c.daysPending > 180).length;

    return {
        totalIssues: ranked.length,
        criticalCount,
        lifeSafetyCount,
        avgScore,
        topCategories,
        mostAffectedZones,
        longestPending,
        commitmentCount: commitments.length,
        overdueCommitments,
    };
}

async function handleQuery(query, { grievances, commitments, mediaIssues = [] }) {
    const intent = matchIntent(query);
    const ranked = rankAllIssues(grievances, { mediaIssues, commitments });

    // Fast-path: keyword-matched intents
    if (intent === "URGENT_ATTENTION") {
        const critical = ranked
            .filter((g) => g.label === "Critical")
            .map((g) => ({
                rank: g.rank,
                id: g.id,
                title: g.title,
                score: g.score,
                issueType: g.issueType,
                region: g.region,
                aiReasoning: g.aiReasoning,
                daysPending: g.daysPending,
                complaintsCount: g.complaintsCount,
            }));

        return {
            intent,
            count: critical.length,
            results: critical,
        };
    }

    if (intent === "OVERDUE_COMMITMENTS") {
        const overdue = commitments
            .filter((c) => c.daysPending > 180)
            .sort((a, b) => b.daysPending - a.daysPending);

        return {
            intent,
            count: overdue.length,
            results: overdue,
        };
    }

    if (intent === "ESCALATION_RISK") {
        const atRisk = ranked
            .filter((g) => g.escalationRisk >= 4)
            .map((g) => ({
                rank: g.rank,
                id: g.id,
                title: g.title,
                score: g.score,
                escalationRisk: g.escalationRisk,
                region: g.region,
                aiReasoning: g.aiReasoning,
            }));

        return {
            intent,
            count: atRisk.length,
            results: atRisk,
        };
    }

    // No keyword match → use Gemini AI for free-text query
    const dataContext = buildDataContext(ranked, commitments);
    const aiResponse = await generateAIInsight(query, dataContext);

    return {
        intent: "AI_GENERATED",
        aiPowered: true,
        answer: aiResponse.answer,
        source: aiResponse.source,
        dataContext: {
            totalIssues: dataContext.totalIssues,
            criticalCount: dataContext.criticalCount,
        },
    };
}

module.exports = { handleQuery };
