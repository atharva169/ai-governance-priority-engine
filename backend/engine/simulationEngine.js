/**
 * Simulation Engine — "What Changed Since Last Login?"
 *
 * Automatically simulates realistic daily mutations for the number
 * of days elapsed since a user's last login, and computes the
 * accumulated change report. No manual "advance day" button needed.
 */

const { rankAllIssues } = require("./scoringEngine");

// ─── Pool of "Incoming" Grievances ───
// These represent real events that could appear while the user was away.
const INCOMING_POOL = [
    {
        id: "GRV-SIM-01",
        title: "Gas leak reported near Pragati Maidan metro station",
        description: "Multiple residents reported a strong gas smell near the metro station exit. Fire services dispatched.",
        category: "Public Safety",
        issueType: "life-safety",
        region: "Pragati Maidan, Central Delhi",
        complaintsCount: 87, sentimentSeverity: 5, daysPending: 1,
        publicVisibility: 5, escalationRisk: 5, status: "open",
    },
    {
        id: "GRV-SIM-02",
        title: "Overflowing sewage on Mehrauli-Badarpur Road",
        description: "Main sewer line burst causing raw sewage to flood a 200m stretch of the service road.",
        category: "Sanitation",
        issueType: "essential-service",
        region: "Mehrauli, South Delhi",
        complaintsCount: 134, sentimentSeverity: 4, daysPending: 3,
        publicVisibility: 4, escalationRisk: 3, status: "open",
    },
    {
        id: "GRV-SIM-03",
        title: "Unauthorized construction blocking emergency lane in Rohini",
        description: "Illegal structure on emergency vehicle lane, rendering fire truck access impossible.",
        category: "Infrastructure",
        issueType: "life-safety",
        region: "Rohini, North Delhi",
        complaintsCount: 56, sentimentSeverity: 4, daysPending: 5,
        publicVisibility: 3, escalationRisk: 4, status: "open",
    },
    {
        id: "GRV-SIM-04",
        title: "Prolonged power outages in Shahdara industrial belt",
        description: "Daily 6-8 hour power cuts affecting small manufacturing units.",
        category: "Power Supply",
        issueType: "essential-service",
        region: "Shahdara, East Delhi",
        complaintsCount: 210, sentimentSeverity: 4, daysPending: 12,
        publicVisibility: 4, escalationRisk: 4, status: "open",
    },
    {
        id: "GRV-SIM-05",
        title: "Stray dog menace at Janakpuri children's park",
        description: "Pack of aggressive stray dogs has injured 3 children in the last week.",
        category: "Public Safety",
        issueType: "life-safety",
        region: "Janakpuri, West Delhi",
        complaintsCount: 95, sentimentSeverity: 5, daysPending: 7,
        publicVisibility: 4, escalationRisk: 5, status: "open",
    },
];

/**
 * Apply one day of mutations to a grievances snapshot (pure function).
 * Uses a seeded random approach so the same dayIndex produces consistent results.
 */
function mutateOneDay(grievances, dayIndex) {
    const mutated = JSON.parse(JSON.stringify(grievances));
    // Simple seeded pseudo-random based on dayIndex
    const seed = (n) => ((dayIndex * 9301 + n * 49297) % 233280) / 233280;

    mutated.forEach((g, i) => {
        if (g.status !== "open") return;
        g.daysPending = (g.daysPending || 0) + 1;

        if (seed(i * 3 + 1) < 0.3) {
            g.complaintsCount = (g.complaintsCount || 0) + Math.floor(seed(i * 7) * 25) + 5;
        }
        if (seed(i * 5 + 2) < 0.1) {
            g.sentimentSeverity = Math.min(5, (g.sentimentSeverity || 1) + 1);
        }
        if (seed(i * 11 + 3) < 0.08) {
            g.escalationRisk = Math.min(5, (g.escalationRisk || 1) + 1);
        }
    });

    // Possibly resolve a low-priority issue
    if (seed(100) < 0.3) {
        const lowPriority = mutated.filter(
            (g) => g.status === "open" && g.sentimentSeverity <= 3 && g.escalationRisk <= 3
        );
        if (lowPriority.length > 0) {
            const idx = Math.floor(seed(200) * lowPriority.length);
            lowPriority[idx].status = "resolved";
        }
    }

    // Possibly inject a new issue (max 1 per day, from the pool)
    if (seed(300) < 0.4 && dayIndex < INCOMING_POOL.length) {
        mutated.push(JSON.parse(JSON.stringify(INCOMING_POOL[dayIndex])));
    }

    return mutated;
}

/**
 * Compute changes between two ranked snapshots.
 */
function computeChanges(beforeRanked, afterRanked) {
    const prevMap = new Map(beforeRanked.map((i) => [i.id, i]));
    const currMap = new Map(afterRanked.map((i) => [i.id, i]));

    const newCritical = [];
    const deescalated = [];
    const scoreChanges = [];
    const resolved = [];
    const newIssues = [];

    for (const curr of afterRanked) {
        const prev = prevMap.get(curr.id);
        if (!prev) {
            newIssues.push({ id: curr.id, title: curr.title, region: curr.region, score: curr.score, label: curr.label });
            continue;
        }
        const delta = curr.score - prev.score;
        if (curr.label === "Critical" && prev.label !== "Critical") {
            newCritical.push({ id: curr.id, title: curr.title, region: curr.region, oldScore: prev.score, newScore: curr.score, delta });
        }
        if (prev.label === "Critical" && curr.label !== "Critical") {
            deescalated.push({ id: curr.id, title: curr.title, region: curr.region, oldScore: prev.score, newScore: curr.score, delta });
        }
        if (Math.abs(delta) >= 1) {
            scoreChanges.push({ id: curr.id, title: curr.title, region: curr.region, oldScore: prev.score, newScore: curr.score, delta });
        }
    }

    for (const prev of beforeRanked) {
        if (!currMap.has(prev.id)) {
            resolved.push({ id: prev.id, title: prev.title, region: prev.region, lastScore: prev.score });
        }
    }

    scoreChanges.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    return { newCritical, deescalated, scoreChanges: scoreChanges.slice(0, 8), resolved, newIssues };
}

/**
 * Simulate N days and return the accumulated change report comparing Day 0 vs Day N.
 * This is the main entry point — called automatically when a user loads the dashboard.
 */
function simulateDaysElapsed(daysElapsed, originalGrievances, mediaIssues, commitments) {
    if (daysElapsed <= 0) {
        return { daysAway: 0, noChanges: true };
    }

    // Cap to avoid excessive computation
    const days = Math.min(daysElapsed, 14);

    // Score the original baseline (Day 0 — when user last logged in)
    const baselineOpen = originalGrievances.filter((g) => g.status === "open");
    const baselineRanked = rankAllIssues(baselineOpen, { mediaIssues, commitments });

    // Mutate through N days
    let current = JSON.parse(JSON.stringify(originalGrievances));
    for (let d = 0; d < days; d++) {
        current = mutateOneDay(current, d);
    }

    // Score the mutated state (Day N — today)
    const currentOpen = current.filter((g) => g.status === "open");
    const currentRanked = rankAllIssues(currentOpen, { mediaIssues, commitments });

    // Compute accumulated changes
    const changes = computeChanges(baselineRanked, currentRanked);

    // Build summary
    const parts = [];
    if (changes.newCritical.length > 0) parts.push(`${changes.newCritical.length} issue(s) escalated to Critical`);
    if (changes.deescalated.length > 0) parts.push(`${changes.deescalated.length} de-escalated`);
    if (changes.newIssues.length > 0) parts.push(`${changes.newIssues.length} new issue(s) reported`);
    if (changes.resolved.length > 0) parts.push(`${changes.resolved.length} resolved`);
    const summary = parts.join(" · ") || "No significant changes.";

    return {
        daysAway: days,
        ...changes,
        summary,
        noChanges: false,
    };
}

module.exports = { simulateDaysElapsed };
