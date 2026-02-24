const { scoreIssue } = require("./scoringEngine");

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

function handleQuery(query, { grievances, commitments }) {
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

    if (intent === "URGENT_ATTENTION") {
        const scored = grievances
            .map((g) => ({ ...g, ...scoreIssue(g) }))
            .filter((g) => g.label === "Critical")
            .sort((a, b) => b.score - a.score);

        return {
            intent,
            count: scored.length,
            results: scored,
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
        const atRisk = grievances
            .filter((g) => g.escalationRisk >= 4)
            .map((g) => ({ ...g, ...scoreIssue(g) }))
            .sort((a, b) => b.escalationRisk - a.escalationRisk);

        return {
            intent,
            count: atRisk.length,
            results: atRisk,
        };
    }
}

module.exports = { handleQuery };
