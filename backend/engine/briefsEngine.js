const { scoreIssue } = require("./scoringEngine");

function generateBrief({ grievances, commitments }) {
    const scored = grievances.map((g) => ({
        ...g,
        ...scoreIssue(g),
    }));

    const topCriticalIssues = scored
        .filter((issue) => issue.label === "Critical")
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    const mostDelayedCommitments = [...commitments]
        .sort((a, b) => b.daysPending - a.daysPending)
        .slice(0, 3);

    const highEscalationRisks = scored.filter(
        (issue) => issue.escalationRisk >= 4 || issue.publicVisibility >= 4
    );

    const executiveSummary = buildExecutiveSummary(
        scored,
        topCriticalIssues,
        mostDelayedCommitments,
        highEscalationRisks
    );

    return {
        topCriticalIssues,
        mostDelayedCommitments,
        highEscalationRisks,
        executiveSummary,
    };
}

function buildExecutiveSummary(
    allIssues,
    critical,
    delayed,
    escalationRisks
) {
    const totalIssues = allIssues.length;
    const criticalCount = critical.length;
    const escalationCount = escalationRisks.length;
    const maxDelay = delayed.length > 0 ? delayed[0].daysPending : 0;

    const sentences = [];

    sentences.push(
        `The governance dashboard currently tracks ${totalIssues} active issues across multiple categories.`
    );

    if (criticalCount > 0) {
        sentences.push(
            `${criticalCount} issue${criticalCount > 1 ? "s" : ""} ${criticalCount > 1 ? "are" : "is"} classified as Critical and require${criticalCount === 1 ? "s" : ""} immediate administrative attention.`
        );
    } else {
        sentences.push(
            "No issues are currently classified as Critical."
        );
    }

    if (delayed.length > 0) {
        sentences.push(
            `The most delayed public commitment has been pending for ${maxDelay} days, indicating follow-through gaps in key areas.`
        );
    }

    if (escalationCount > 0) {
        sentences.push(
            `${escalationCount} issue${escalationCount > 1 ? "s" : ""} ${escalationCount > 1 ? "exhibit" : "exhibits"} elevated escalation risk or high public visibility, warranting close monitoring.`
        );
    }

    sentences.push(
        "This brief is generated from current data and does not constitute policy guidance."
    );

    return sentences.join(" ");
}

module.exports = { generateBrief };
