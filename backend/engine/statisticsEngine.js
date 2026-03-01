/**
 * Statistics Engine — Governance Intelligence Analytics
 *
 * Computes comprehensive statistical analysis of the priority scoring results.
 * Provides distribution stats, category breakdowns, risk correlations,
 * and an overall Governance Health Score.
 */

const { rankAllIssues, WEIGHTS, FACTOR_LABELS } = require("./scoringEngine");

/**
 * Compute full statistical analysis of all scored issues.
 */
function computeStatistics(grievances, { mediaIssues = [], commitments = [] } = {}) {
    const ranked = rankAllIssues(grievances, { mediaIssues, commitments });
    const scores = ranked.map((r) => r.score);
    const n = scores.length;

    if (n === 0) {
        return { error: "No issues to analyze", ranked: [] };
    }

    // ─── Distribution Statistics ───
    const sorted = [...scores].sort((a, b) => a - b);
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];
    const stdDev = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / n);
    const min = sorted[0];
    const max = sorted[n - 1];
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];

    const distribution = {
        count: n,
        mean: Math.round(mean * 10) / 10,
        median: Math.round(median * 10) / 10,
        standardDeviation: Math.round(stdDev * 10) / 10,
        min,
        max,
        range: max - min,
        q1,
        q3,
        iqr: q3 - q1,
    };

    // ─── Label Distribution ───
    const labelCounts = {
        Critical: ranked.filter((r) => r.label === "Critical").length,
        "Attention Required": ranked.filter((r) => r.label === "Attention Required").length,
        Stable: ranked.filter((r) => r.label === "Stable").length,
    };

    // ─── Category-wise Analysis ───
    const categoryMap = {};
    for (const issue of ranked) {
        const cat = issue.category || "Unknown";
        if (!categoryMap[cat]) {
            categoryMap[cat] = { scores: [], issues: [], avgDaysPending: 0 };
        }
        categoryMap[cat].scores.push(issue.score);
        categoryMap[cat].issues.push(issue.id);
    }

    const categoryAnalysis = Object.entries(categoryMap)
        .map(([category, data]) => {
            const catMean = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
            const catMax = Math.max(...data.scores);
            return {
                category,
                issueCount: data.issues.length,
                avgScore: Math.round(catMean * 10) / 10,
                maxScore: catMax,
                riskLevel: catMean >= 65 ? "Critical" : catMean >= 40 ? "Elevated" : "Normal",
            };
        })
        .sort((a, b) => b.avgScore - a.avgScore);

    // ─── Issue-Type Analysis ───
    const typeMap = {};
    for (const issue of ranked) {
        const t = issue.issueType || "unknown";
        if (!typeMap[t]) typeMap[t] = { scores: [], count: 0 };
        typeMap[t].scores.push(issue.score);
        typeMap[t].count++;
    }

    const issueTypeAnalysis = Object.entries(typeMap)
        .map(([type, data]) => ({
            type,
            count: data.count,
            avgScore: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.count) * 10) / 10,
            maxScore: Math.max(...data.scores),
        }))
        .sort((a, b) => b.avgScore - a.avgScore);

    // ─── Governance Health Score ───
    // Inverse of average priority — lower average priority = healthier governance
    // Scale: 0 (all critical) to 100 (all stable)
    const healthScore = Math.round(Math.max(0, 100 - mean * 1.2));
    const healthLabel =
        healthScore >= 70 ? "Good" :
            healthScore >= 45 ? "Needs Attention" :
                "Critical";

    // ─── Factor Importance Analysis ───
    // Which factors contribute most across all issues
    const factorTotals = {};
    for (const factor of Object.keys(WEIGHTS)) {
        factorTotals[factor] = {
            label: FACTOR_LABELS[factor] || factor,
            totalContribution: 0,
            avgWeighted: 0,
        };
    }

    for (const issue of ranked) {
        for (const [factor, data] of Object.entries(issue.factorBreakdown)) {
            if (factorTotals[factor]) {
                factorTotals[factor].totalContribution += data.weighted;
            }
        }
    }

    for (const factor of Object.keys(factorTotals)) {
        factorTotals[factor].avgWeighted =
            Math.round((factorTotals[factor].totalContribution / n) * 10) / 10;
    }

    const factorImportance = Object.entries(factorTotals)
        .map(([key, val]) => ({
            factor: key,
            label: val.label,
            avgContribution: val.avgWeighted,
            weight: WEIGHTS[key],
        }))
        .sort((a, b) => b.avgContribution - a.avgContribution);

    // ─── Risk Insights ───
    const insights = [];

    if (labelCounts.Critical >= 3) {
        insights.push({
            type: "warning",
            message: `${labelCounts.Critical} out of ${n} issues are classified Critical — governance attention is urgently needed.`,
        });
    }

    const highPendingCount = ranked.filter((r) => r.daysPending >= 90).length;
    if (highPendingCount >= 3) {
        insights.push({
            type: "warning",
            message: `${highPendingCount} issues have been pending for over 90 days, indicating systemic resolution delays.`,
        });
    }

    if (stdDev > 20) {
        insights.push({
            type: "info",
            message: `High score variance (σ=${distribution.standardDeviation}) indicates significant disparity in issue severity — triage is effective.`,
        });
    } else {
        insights.push({
            type: "info",
            message: `Low score variance (σ=${distribution.standardDeviation}) — most issues cluster at similar priority. Fine-grained differentiation may need additional data.`,
        });
    }

    const lifeSafetyCount = ranked.filter((r) => r.issueType === "life-safety").length;
    if (lifeSafetyCount > 0) {
        insights.push({
            type: "critical",
            message: `${lifeSafetyCount} life-safety issues are active. These pose direct risk to human health and must be resolved first.`,
        });
    }

    return {
        distribution,
        labelCounts,
        categoryAnalysis,
        issueTypeAnalysis,
        governanceHealth: {
            score: healthScore,
            label: healthLabel,
            description: healthScore >= 70
                ? "Most governance issues are under control with few critical items."
                : healthScore >= 45
                    ? "Several issues require escalated attention. Response capacity may be strained."
                    : "Multiple critical issues are active. Governance response is significantly behind.",
        },
        factorImportance,
        insights,
        ranked,
    };
}

module.exports = { computeStatistics };
