const { rankAllIssues } = require("./scoringEngine");

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

function handleQuery(query, { grievances, commitments, mediaIssues = [] }) {
    const intent = matchIntent(query);

    if (!intent) {
        return {
            intent: null,
            error: "Unsupported query",
            supportedQueries: [
                "What needs urgent attention today?",
                "Which commitments are overdue?",
                "Which issues are likely to escalate?",
            ],
        };
    }

    const ranked = rankAllIssues(grievances, { mediaIssues, commitments });

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
}

module.exports = { handleQuery };
