/**
 * AI Priority Scoring Engine — Core Intelligence Module
 *
 * Multi-layer algorithmic scoring for governance issue prioritization.
 * Uses 7 weighted factors with cross-issue relative ranking,
 * issue-type severity classification, media amplification,
 * and commitment breach linkage.
 *
 * All scoring is deterministic, explainable, and auditable.
 */

// ─── Issue-Type Severity Classification ───
// The AI classifies issues by fundamental urgency tier.
// Life-safety issues inherently outrank amenity issues regardless of other factors.
const ISSUE_TYPE_SEVERITY = {
    "life-safety": 1.0,       // Immediate threat to human life or health
    "essential-service": 0.7, // Basic necessities: water, power, pensions
    "infrastructure": 0.45,   // Roads, drainage, public works
    "amenity": 0.15,          // Parks, streetlights, community facilities
};

// ─── Factor Weights (must sum to 1.0) ───
const WEIGHTS = {
    issueTypeSeverity: 0.20,   // Life-safety > essential > infrastructure > amenity
    complaintVolume: 0.15,     // Population-normalized complaint density
    sentimentSeverity: 0.15,   // Public anger/desperation level
    daysPending: 0.15,         // Delay urgency with exponential decay curve
    publicVisibility: 0.10,    // Media and social exposure
    escalationRisk: 0.10,      // Likelihood of political/legal escalation
    mediaAmplification: 0.08,  // Cross-referenced from media coverage
    commitmentBreach: 0.07,    // Linked public commitment is broken
};

// ─── Normalization Constants ───
const COMPLAINTS_CAP = 600;
const DAYS_PENDING_TAU = 120;  // Exponential decay time constant
const SCALE_MAX = 5;

// ─── Normalization Functions ───

/**
 * Linear normalization clamped to [0, 1]
 */
function linearNorm(value, max) {
    return Math.min(Math.max(value / max, 0), 1);
}

/**
 * Exponential saturation curve — issues pending longer curve sharply upward
 * instead of linearly. An issue at 90 days scores much higher relative
 * to 30 days than a flat linear would produce.
 */
function exponentialDelay(daysPending) {
    return 1 - Math.exp(-daysPending / DAYS_PENDING_TAU);
}

/**
 * Compute media amplification factor for an issue.
 * Cross-references media articles linked to this grievance.
 * More articles with higher impact = higher amplification.
 */
function computeMediaAmplification(issueId, mediaIssues) {
    const linked = mediaIssues.filter(
        (m) => m.linkedGrievanceIds && m.linkedGrievanceIds.includes(issueId)
    );

    if (linked.length === 0) return 0;

    // Average impact level of all media articles, plus article count bonus
    const avgImpact = linked.reduce((sum, m) => sum + (m.publicImpactLevel || 0), 0) / linked.length;
    const countBonus = Math.min(linked.length * 0.15, 0.3); // Up to 0.3 bonus for multiple articles

    return Math.min(linearNorm(avgImpact, SCALE_MAX) + countBonus, 1.0);
}

/**
 * Compute commitment breach factor for an issue.
 * If a linked public commitment is overdue/stalled, the issue priority is amplified.
 */
function computeCommitmentBreach(issueId, commitments) {
    const linked = commitments.filter(
        (c) => c.linkedGrievanceIds && c.linkedGrievanceIds.includes(issueId)
    );

    if (linked.length === 0) return 0;

    // Find the worst commitment breach
    let maxBreach = 0;
    for (const commitment of linked) {
        const statusMultiplier =
            commitment.status === "stalled" ? 1.0
                : commitment.status === "delayed" ? 0.8
                    : commitment.status === "not-started" ? 0.7
                        : commitment.status === "in-progress" ? 0.3
                            : 0;

        const delayFactor = exponentialDelay(commitment.daysPending);
        const breach = statusMultiplier * delayFactor;
        if (breach > maxBreach) maxBreach = breach;
    }

    return maxBreach;
}

// ─── Core Scoring Function ───

/**
 * Score a single issue using the multi-factor AI model.
 * Returns score, label, confidence, factor breakdown, and AI reasoning.
 */
function scoreIssue(issue, { mediaIssues = [], commitments = [] } = {}) {
    // Compute raw factor values (all normalized to [0, 1])
    const factors = {
        issueTypeSeverity: ISSUE_TYPE_SEVERITY[issue.issueType] || 0.45,
        complaintVolume: linearNorm(issue.complaintsCount, COMPLAINTS_CAP),
        sentimentSeverity: linearNorm(issue.sentimentSeverity, SCALE_MAX),
        daysPending: exponentialDelay(issue.daysPending),
        publicVisibility: linearNorm(issue.publicVisibility, SCALE_MAX),
        escalationRisk: linearNorm(issue.escalationRisk, SCALE_MAX),
        mediaAmplification: computeMediaAmplification(issue.id, mediaIssues),
        commitmentBreach: computeCommitmentBreach(issue.id, commitments),
    };

    // Compute weighted score
    let rawScore = 0;
    const factorBreakdown = {};

    for (const [factor, weight] of Object.entries(WEIGHTS)) {
        const rawValue = factors[factor];
        const weighted = rawValue * weight * 100;
        rawScore += weighted;

        factorBreakdown[factor] = {
            raw: Math.round(rawValue * 1000) / 1000,
            weighted: Math.round(weighted * 10) / 10,
            weight: weight,
        };
    }

    const score = Math.round(rawScore);

    // Compute contribution percentages
    for (const factor of Object.keys(factorBreakdown)) {
        const pct = score > 0 ? (factorBreakdown[factor].weighted / score) * 100 : 0;
        factorBreakdown[factor].contribution = Math.round(pct * 10) / 10 + "%";
    }

    // Determine label and confidence
    const label = getLabel(score);
    const confidence = getConfidence(factors);

    return {
        score,
        label,
        confidence,
        factorBreakdown,
        factors, // raw factors for statistical use
    };
}

function getLabel(score) {
    if (score >= 65) return "Critical";
    if (score >= 40) return "Attention Required";
    return "Stable";
}

/**
 * AI confidence level based on data completeness and factor clarity
 */
function getConfidence(factors) {
    // High confidence when multiple factors agree on severity
    const highFactors = Object.values(factors).filter((v) => v >= 0.7).length;
    const lowFactors = Object.values(factors).filter((v) => v <= 0.2).length;

    if (highFactors >= 4) return "high";
    if (highFactors >= 2 || lowFactors >= 4) return "medium";
    return "low";
}

// ─── Cross-Issue Ranking Engine ───

/**
 * Rank all issues relative to each other.
 * Computes percentiles, z-scores, and generates AI reasoning narratives.
 */
function rankAllIssues(grievances, { mediaIssues = [], commitments = [] } = {}) {
    // Phase 1: Score each issue independently
    const scored = grievances.map((g) => ({
        ...g,
        ...scoreIssue(g, { mediaIssues, commitments }),
    }));

    // Phase 2: Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Phase 3: Compute cross-issue statistics
    const scores = scored.map((s) => s.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = Math.sqrt(
        scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    );

    // Phase 4: Assign ranks, percentiles, z-scores, and generate reasoning
    const totalIssues = scored.length;

    for (let i = 0; i < scored.length; i++) {
        const issue = scored[i];
        const rank = i + 1;

        // Percentile: % of issues this one outranks
        const percentile = Math.round(((totalIssues - rank) / totalIssues) * 100);

        // Z-score: how many standard deviations above/below mean
        const zScore = stdDev > 0 ? Math.round(((issue.score - mean) / stdDev) * 100) / 100 : 0;

        // AI reasoning narrative
        const aiReasoning = generateAIReasoning(issue, rank, totalIssues, mean);

        // Comparison to next-ranked issue
        const comparisonToNext = i < scored.length - 1
            ? generateComparison(issue, scored[i + 1], rank)
            : null;

        issue.rank = rank;
        issue.percentile = percentile;
        issue.zScore = zScore;
        issue.aiReasoning = aiReasoning;
        issue.comparisonToNext = comparisonToNext;

        // Generate human-friendly explanation
        issue.explanation = generateExplanation(issue, rank, totalIssues);
    }

    return scored;
}

// ─── AI Reasoning Generator ───

const ISSUE_TYPE_LABELS = {
    "life-safety": "life-safety threat",
    "essential-service": "essential service disruption",
    "infrastructure": "infrastructure issue",
    "amenity": "amenity concern",
};

const FACTOR_LABELS = {
    issueTypeSeverity: "issue severity classification",
    complaintVolume: "complaint volume",
    sentimentSeverity: "public sentiment",
    daysPending: "pending duration",
    publicVisibility: "public visibility",
    escalationRisk: "escalation risk",
    mediaAmplification: "media coverage",
    commitmentBreach: "commitment breach",
};

function generateAIReasoning(issue, rank, totalIssues, mean) {
    const parts = [];
    const typeLabel = ISSUE_TYPE_LABELS[issue.issueType] || "governance issue";

    // Opening — rank context
    if (rank === 1) {
        parts.push(`Ranked #1 of ${totalIssues} issues as the highest-priority governance concern.`);
    } else if (rank <= 3) {
        parts.push(`Ranked #${rank} of ${totalIssues} — a top-tier priority requiring immediate attention.`);
    } else if (issue.score >= mean) {
        parts.push(`Ranked #${rank} of ${totalIssues}, scoring above the average priority threshold.`);
    } else {
        parts.push(`Ranked #${rank} of ${totalIssues}, below the priority average.`);
    }

    // Issue type classification reasoning
    parts.push(`Classified as a ${typeLabel} (${issue.issueType}), which carries a ${Math.round(ISSUE_TYPE_SEVERITY[issue.issueType] * 100)}% severity baseline.`);

    // Top contributing factors
    const sortedFactors = Object.entries(issue.factorBreakdown)
        .sort((a, b) => b[1].weighted - a[1].weighted)
        .slice(0, 3);

    const factorParts = sortedFactors.map(([key, val]) => {
        const label = FACTOR_LABELS[key] || key;
        return `${label} (${val.contribution} of total score)`;
    });

    parts.push(`Primary drivers: ${factorParts.join(", ")}.`);

    // Specific data points
    if (issue.complaintsCount >= 200) {
        parts.push(`${issue.complaintsCount} complaints indicate widespread public impact.`);
    }
    if (issue.daysPending >= 90) {
        parts.push(`Pending for ${issue.daysPending} days — significantly beyond the 30-day standard response window.`);
    }
    if (issue.factorBreakdown.mediaAmplification && issue.factorBreakdown.mediaAmplification.raw > 0) {
        parts.push(`Active media coverage is amplifying public pressure.`);
    }
    if (issue.factorBreakdown.commitmentBreach && issue.factorBreakdown.commitmentBreach.raw > 0) {
        parts.push(`A linked public commitment is overdue, increasing accountability risk.`);
    }

    return parts.join(" ");
}

function generateComparison(higher, lower, higherRank) {
    const scoreDiff = higher.score - lower.score;
    const parts = [];

    parts.push(`Outranks #${higherRank + 1} ("${lower.title}") by ${scoreDiff} points.`);

    // Find the biggest factor differences
    const factorDiffs = [];
    for (const factor of Object.keys(WEIGHTS)) {
        const diff = (higher.factorBreakdown[factor]?.weighted || 0) - (lower.factorBreakdown[factor]?.weighted || 0);
        if (Math.abs(diff) >= 1.5) {
            factorDiffs.push({ factor, diff: Math.round(diff * 10) / 10 });
        }
    }

    factorDiffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    if (factorDiffs.length > 0) {
        const topDiff = factorDiffs[0];
        const label = FACTOR_LABELS[topDiff.factor] || topDiff.factor;
        if (topDiff.diff > 0) {
            parts.push(`Key differentiator: higher ${label} (+${topDiff.diff} pts).`);
        } else {
            parts.push(`Despite lower ${label} (${topDiff.diff} pts), other factors compensate.`);
        }
    }

    // Issue type comparison
    if (higher.issueType !== lower.issueType) {
        const higherLabel = ISSUE_TYPE_LABELS[higher.issueType] || higher.issueType;
        const lowerLabel = ISSUE_TYPE_LABELS[lower.issueType] || lower.issueType;
        parts.push(`Classification advantage: ${higherLabel} vs. ${lowerLabel}.`);
    }

    return parts.join(" ");
}

function generateExplanation(issue, rank, totalIssues) {
    const typeLabel = ISSUE_TYPE_LABELS[issue.issueType] || "governance issue";
    const parts = [];

    parts.push(`Priority rank: #${rank} of ${totalIssues} (score: ${issue.score}/100, ${issue.label}).`);
    parts.push(`This is a ${typeLabel}.`);

    const topFactors = Object.entries(issue.factorBreakdown)
        .sort((a, b) => b[1].weighted - a[1].weighted)
        .slice(0, 2)
        .map(([key, val]) => `${FACTOR_LABELS[key] || key} (${val.contribution})`);

    parts.push(`Top scoring factors: ${topFactors.join(", ")}.`);

    if (issue.complaintsCount >= 100) {
        parts.push(`${issue.complaintsCount} complaints registered.`);
    }
    if (issue.daysPending >= 60) {
        parts.push(`Pending ${issue.daysPending} days.`);
    }

    return parts.join(" ");
}

module.exports = { scoreIssue, rankAllIssues, WEIGHTS, ISSUE_TYPE_SEVERITY, FACTOR_LABELS };
