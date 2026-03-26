/**
 * Sentiment Analysis Engine — NLP-Based Public Anger Detection
 *
 * Uses the AFINN-based `sentiment` npm package to score grievance text.
 * Converts raw NLP scores into the 1-5 severity scale used by the scoring engine.
 * Tracks zone-level sentiment trends with rolling windows for real-time monitoring.
 *
 * Architecture:
 *   Grievance text → NLP tokenization → AFINN scoring → Severity mapping → Zone aggregation
 */

const Sentiment = require("sentiment");
const analyzer = new Sentiment();

// ─── Severity Mapping ───
// The `sentiment` package returns a `comparative` score (per-word average).
// Range is roughly -1.0 (very angry) to +1.0 (positive).
// We invert and map to 1-5 severity scale for the governance engine.

const SEVERITY_THRESHOLDS = [
    { maxComparative: -0.6, severity: 5, label: "Outraged" },
    { maxComparative: -0.35, severity: 4, label: "Angry" },
    { maxComparative: -0.15, severity: 3, label: "Frustrated" },
    { maxComparative: -0.05, severity: 2, label: "Concerned" },
    { maxComparative: Infinity, severity: 1, label: "Neutral" },
];

const SEVERITY_EMOJI = {
    5: "🔴",
    4: "😡",
    3: "😠",
    2: "😐",
    1: "😊",
};

// ─── Zone Trend Tracker ───
// Rolling window per zone — stores last N sentiment readings with timestamps.
const TREND_WINDOW_SIZE = 50;     // Max data points per zone
const TREND_WINDOW_MS = 3600000;  // 1 hour window for % change calculations

const zoneTrends = {
    "North Delhi": [],
    "South Delhi": [],
    "East Delhi": [],
    "West Delhi": [],
    "Central Delhi": [],
};

// Global sentiment history for overall trend
const globalHistory = [];

// ─── Core Functions ───

/**
 * Analyze the sentiment of grievance text using NLP.
 *
 * @param {string} text - The grievance description text
 * @returns {{ rawScore: number, comparative: number, severity: number, label: string, emoji: string, keywords: string[], wordCount: number }}
 */
function analyzeSentiment(text) {
    if (!text || typeof text !== "string") {
        return {
            rawScore: 0,
            comparative: 0,
            severity: 3,
            label: "Unknown",
            emoji: "❓",
            keywords: [],
            wordCount: 0,
        };
    }

    const result = analyzer.analyze(text);

    // Extract top negative words (anger keywords)
    const negativeWords = (result.negative || [])
        .sort((a, b) => {
            // Sort by AFINN score magnitude (most negative first)
            const scoreA = result.calculation?.find(c => c[a] !== undefined)?.[a] || 0;
            const scoreB = result.calculation?.find(c => c[b] !== undefined)?.[b] || 0;
            return scoreA - scoreB;
        })
        .slice(0, 5);

    // Map comparative score to severity
    const comparative = result.comparative;
    const mapping = SEVERITY_THRESHOLDS.find(t => comparative <= t.maxComparative)
        || SEVERITY_THRESHOLDS[SEVERITY_THRESHOLDS.length - 1];

    return {
        rawScore: result.score,
        comparative: Math.round(comparative * 1000) / 1000,
        severity: mapping.severity,
        label: mapping.label,
        emoji: SEVERITY_EMOJI[mapping.severity] || "❓",
        keywords: negativeWords,
        wordCount: result.tokens?.length || 0,
    };
}

/**
 * Record a sentiment reading for zone-level trend tracking.
 *
 * @param {string} region - The full region string (e.g., "Narela, North Delhi")
 * @param {number} severity - The computed severity (1-5)
 * @param {number} comparative - The NLP comparative score
 */
function recordZoneSentiment(region, severity, comparative) {
    const zone = extractZone(region);
    if (!zone || !zoneTrends[zone]) return;

    const entry = {
        severity,
        comparative,
        timestamp: Date.now(),
    };

    // Add to zone trend
    zoneTrends[zone].push(entry);
    if (zoneTrends[zone].length > TREND_WINDOW_SIZE) {
        zoneTrends[zone] = zoneTrends[zone].slice(-TREND_WINDOW_SIZE);
    }

    // Add to global history
    globalHistory.push(entry);
    if (globalHistory.length > TREND_WINDOW_SIZE * 5) {
        globalHistory.splice(0, globalHistory.length - TREND_WINDOW_SIZE * 5);
    }
}

/**
 * Extract zone name from a full region string.
 * e.g., "Narela, North Delhi" → "North Delhi"
 */
function extractZone(region) {
    if (!region) return null;
    const zones = Object.keys(zoneTrends);
    return zones.find(z => region.includes(z)) || null;
}

/**
 * Get sentiment trends for all zones.
 *
 * @returns {{ zones: Array, global: Object }}
 */
function getZoneTrends() {
    const now = Date.now();
    const zones = [];

    for (const [zone, entries] of Object.entries(zoneTrends)) {
        if (entries.length === 0) {
            zones.push({
                zone,
                avgSeverity: 0,
                avgComparative: 0,
                trend: "stable",
                trendArrow: "→",
                changePercent: 0,
                dataPoints: 0,
                label: "No data",
                emoji: "⏳",
            });
            continue;
        }

        // Current average (all data)
        const avgSeverity = entries.reduce((s, e) => s + e.severity, 0) / entries.length;
        const avgComparative = entries.reduce((s, e) => s + e.comparative, 0) / entries.length;

        // Recent vs older comparison for trend
        const recentCutoff = now - TREND_WINDOW_MS / 2; // last 30 minutes
        const recent = entries.filter(e => e.timestamp >= recentCutoff);
        const older = entries.filter(e => e.timestamp < recentCutoff);

        let changePercent = 0;
        let trend = "stable";
        let trendArrow = "→";

        if (recent.length > 0 && older.length > 0) {
            const recentAvg = recent.reduce((s, e) => s + e.severity, 0) / recent.length;
            const olderAvg = older.reduce((s, e) => s + e.severity, 0) / older.length;

            if (olderAvg > 0) {
                changePercent = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
            }

            if (changePercent > 5) {
                trend = "rising";
                trendArrow = "↑";
            } else if (changePercent < -5) {
                trend = "falling";
                trendArrow = "↓";
            }
        }

        // Severity label for the zone
        const roundedSeverity = Math.round(avgSeverity);
        const mapping = SEVERITY_THRESHOLDS.find((_, i) =>
            roundedSeverity >= SEVERITY_THRESHOLDS.length - i
        ) || SEVERITY_THRESHOLDS[2];

        zones.push({
            zone,
            avgSeverity: Math.round(avgSeverity * 10) / 10,
            avgComparative: Math.round(avgComparative * 1000) / 1000,
            trend,
            trendArrow,
            changePercent,
            dataPoints: entries.length,
            label: SEVERITY_THRESHOLDS.find(t => avgComparative <= t.maxComparative)?.label || "Neutral",
            emoji: SEVERITY_EMOJI[roundedSeverity] || "😐",
        });
    }

    // Sort by severity (most angry first)
    zones.sort((a, b) => b.avgSeverity - a.avgSeverity);

    // Global stats
    const allEntries = Object.values(zoneTrends).flat();
    const globalAvgSeverity = allEntries.length > 0
        ? allEntries.reduce((s, e) => s + e.severity, 0) / allEntries.length
        : 0;

    // Collect all keywords from recent grievances (provided externally)
    return {
        zones,
        global: {
            avgSeverity: Math.round(globalAvgSeverity * 10) / 10,
            totalDataPoints: allEntries.length,
            label: SEVERITY_THRESHOLDS.find(t =>
                (allEntries.length > 0
                    ? allEntries.reduce((s, e) => s + e.comparative, 0) / allEntries.length
                    : 0) <= t.maxComparative
            )?.label || "Neutral",
        },
    };
}

/**
 * Get the top anger keywords from all recent zone data.
 * Must be called externally with keyword data since we don't store full text.
 *
 * @param {string[][]} keywordArrays - Arrays of keyword strings from recent grievances
 * @returns {Array<{word: string, count: number}>} Top keywords sorted by frequency
 */
function aggregateKeywords(keywordArrays) {
    const freq = {};
    for (const arr of keywordArrays) {
        for (const word of arr) {
            const lower = word.toLowerCase();
            freq[lower] = (freq[lower] || 0) + 1;
        }
    }

    return Object.entries(freq)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
}

module.exports = {
    analyzeSentiment,
    recordZoneSentiment,
    getZoneTrends,
    aggregateKeywords,
    SEVERITY_EMOJI,
};
