/**
 * Live Ingestion Engine — Real-Time Grievance Generator & SSE Broadcaster
 *
 * Simulates a government aggregation engine that detects new grievance patterns
 * from incoming citizen complaints. Generates realistic grievances every 15-30s,
 * inserts them into PostgreSQL, scores them, and broadcasts to all SSE listeners.
 *
 * Architecture:
 *   Citizen complaints → Aggregation Engine → New Grievance Pattern → Score → Broadcast
 */

const { v4: uuidv4 } = require("uuid");
const { scoreIssue } = require("./scoringEngine");
const db = require("../db/connection");

// ─── Pool of 28 Delhi Regions ───
const DELHI_REGIONS = [
    "Dwarka, West Delhi", "Laxmi Nagar, East Delhi", "Mahipalpur, South Delhi",
    "Connaught Place, Central Delhi", "Wazirabad, North Delhi", "Shahdara, East Delhi",
    "Jahangirpuri, North Delhi", "Karol Bagh, Central Delhi", "Rohini, North Delhi",
    "Janakpuri, West Delhi", "Tilak Nagar, West Delhi", "Mehrauli, South Delhi",
    "Okhla, South Delhi", "Narela, North Delhi", "GTB Nagar, North Delhi",
    "Patparganj, East Delhi", "ITO, Central Delhi", "Chandni Chowk, Central Delhi",
    "Najafgarh, West Delhi", "Mayur Vihar, East Delhi", "Sangam Vihar, South Delhi",
    "Trilokpuri, East Delhi", "Sarita Vihar, South Delhi", "Hauz Khas, South Delhi",
    "Pitampura, North Delhi", "Saket, South Delhi", "Moti Nagar, West Delhi",
    "Vasant Kunj, South Delhi",
];

// ─── Grievance Template Pool ───
const GRIEVANCE_TEMPLATES = [
    { title: "Water supply disruption in {region}", category: "Water Supply", issueType: "essential-service", desc: "Multiple households report water cut-off exceeding 48 hours. Tanker dependency rising." },
    { title: "Sewage overflow flooding homes near {region}", category: "Sanitation", issueType: "life-safety", desc: "Raw sewage entering residential areas. Health risk escalating rapidly." },
    { title: "Gas leak reported in residential colony, {region}", category: "Public Safety", issueType: "life-safety", desc: "Strong gas odour detected. Residents self-evacuating. Emergency response delayed." },
    { title: "Power outages affecting {region} for 6+ hours daily", category: "Power Supply", issueType: "essential-service", desc: "Transformer overloading causing extended blackouts. Heat-related health risks rising." },
    { title: "Road cave-in near busy intersection, {region}", category: "Roads & Transport", issueType: "life-safety", desc: "A section of road has caved in near a major junction. Vehicles redirected onto narrow lanes." },
    { title: "Illegal waste dumping on vacant plots in {region}", category: "Environment", issueType: "infrastructure", desc: "Construction debris and household waste accumulating on public land. Air quality declining." },
    { title: "Streetlight blackout across {region} main road", category: "Municipal Services", issueType: "amenity", desc: "All streetlights non-functional on a 2km stretch. Pedestrian safety compromised after dark." },
    { title: "Stray dog attacks near school in {region}", category: "Public Safety", issueType: "life-safety", desc: "Pack of aggressive strays has bitten 4 children this week. Parents demanding immediate action." },
    { title: "Building cracks in government school, {region}", category: "Education Infrastructure", issueType: "life-safety", desc: "Widening structural cracks detected. Engineers recommend evacuation. 200 students affected." },
    { title: "Blocked ambulance route in {region}", category: "Healthcare", issueType: "life-safety", desc: "Illegal encroachments causing 30-min ambulance delays. Patient died during transit." },
    { title: "RO water plant broken in {region}", category: "Water Supply", issueType: "essential-service", desc: "Community RO plant non-functional for 30 days. Over 500 families dependent on contaminated water." },
    { title: "Open manhole covers on main road, {region}", category: "Roads & Transport", issueType: "life-safety", desc: "Three manholes missing covers. A cyclist fell in and sustained injuries." },
    { title: "Flooding in underpass near {region}", category: "Infrastructure", issueType: "infrastructure", desc: "Underpass floods with every rainfall. Vehicles stranded for hours. Electrocution risk from submerged cables." },
    { title: "Dengue outbreak linked to stagnant drain in {region}", category: "Public Health", issueType: "life-safety", desc: "42 confirmed dengue cases in past 2 weeks traced to blocked drainage." },
    { title: "Garbage collection stopped for 12 days in {region}", category: "Sanitation", issueType: "essential-service", desc: "Waste piling up in streets. Rodent infestation reported. Respiratory health complaints rising." },
    { title: "Fire safety violation in market area, {region}", category: "Public Safety", issueType: "life-safety", desc: "Fire exits blocked by unauthorized construction. Fire department flagged critical risk." },
    { title: "Overloaded transformer explosion risk in {region}", category: "Power Supply", issueType: "life-safety", desc: "Distribution transformer running at 150% capacity. BSES flagged imminent failure risk." },
    { title: "Pension payment delay — 4 months pending in {region}", category: "Social Welfare", issueType: "essential-service", desc: "Senior citizens in the ward have not received pension for 4 consecutive months." },
    { title: "Broken footpath causing pedestrian falls in {region}", category: "Roads & Transport", issueType: "infrastructure", desc: "Damaged pavement tiles and missing railing on a major walking route. 3 falls reported." },
    { title: "CCTV cameras non-functional in market, {region}", category: "Public Safety", issueType: "amenity", desc: "14 of 20 surveillance cameras offline. Crime incidents spiking in the area." },
    { title: "School bus route hazard due to construction in {region}", category: "Roads & Transport", issueType: "infrastructure", desc: "Ongoing road construction without proper diversions. School buses forced onto unsafe detours." },
    { title: "Contaminated borewell water in {region}", category: "Water Supply", issueType: "life-safety", desc: "Lab tests confirm heavy metal contamination in community borewells. Gastroenteritis cases rising." },
    { title: "Unhygienic food stalls near hospital, {region}", category: "Public Health", issueType: "amenity", desc: "Unlicensed food vendors operating without hygiene standards near government hospital." },
    { title: "Noise pollution from industrial units in {region}", category: "Environment", issueType: "amenity", desc: "Residential area surrounded by factories operating beyond permitted noise levels." },
];

// ─── State ───
const listeners = new Map(); // res → { zone, userId }
let buffer = []; // Rolling buffer of live grievances
let emissionTimer = null;
let cleanupTimer = null;
let totalIngested = 312; // Start with a realistic base count
let isRunning = false;

const BUFFER_MAX = 5000;
const BASE_INTERVAL = 30000; // 30s with 1 listener
const FAST_INTERVAL = 15000; // 15s with 2+ listeners

// ─── Core Functions ───

/**
 * Generate a single realistic grievance with random metrics.
 */
function generateGrievance() {
    const template = GRIEVANCE_TEMPLATES[Math.floor(Math.random() * GRIEVANCE_TEMPLATES.length)];
    const region = DELHI_REGIONS[Math.floor(Math.random() * DELHI_REGIONS.length)];
    const timestamp = Date.now();
    const shortId = uuidv4().split("-")[0];

    const grievance = {
        id: `GRV-LIVE-${timestamp}-${shortId}`,
        title: template.title.replace("{region}", region.split(",")[0]),
        description: template.desc,
        category: template.category,
        issueType: template.issueType,
        region: region,
        status: "open",
        complaintsCount: 50 + Math.floor(Math.random() * 400),
        sentimentSeverity: 1 + Math.floor(Math.random() * 5),
        daysPending: 1 + Math.floor(Math.random() * 155),
        publicVisibility: 1 + Math.floor(Math.random() * 5),
        escalationRisk: 1 + Math.floor(Math.random() * 5),
        source: "live-portal",
        ingestedAt: new Date().toISOString(),
    };

    // Score the grievance using the existing AI engine
    const scored = scoreIssue(grievance);
    grievance.priorityScore = scored.score;
    grievance.priorityLabel = scored.label;
    grievance.aiReasoning = scored.factorBreakdown
        ? `Score ${scored.score}/100 (${scored.label}). Confidence: ${scored.confidence}.`
        : null;

    return { grievance, scored };
}

/**
 * Insert a grievance into PostgreSQL (if available).
 */
async function persistGrievance(grievance) {
    if (!db.isAvailable()) return;

    try {
        const pool = db.getPool();
        await pool.query(
            `INSERT INTO grievances
                (id, title, description, category, issue_type, region, status,
                 complaints_count, sentiment_severity, days_pending,
                 public_visibility, escalation_risk, priority_score,
                 priority_label, ai_reasoning, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
             ON CONFLICT (id) DO NOTHING`,
            [
                grievance.id, grievance.title, grievance.description,
                grievance.category, grievance.issueType, grievance.region,
                grievance.status, grievance.complaintsCount,
                grievance.sentimentSeverity, grievance.daysPending,
                grievance.publicVisibility, grievance.escalationRisk,
                grievance.priorityScore, grievance.priorityLabel,
                grievance.aiReasoning, grievance.source,
            ]
        );
    } catch (err) {
        console.error("Live ingestion DB insert failed:", err.message);
    }
}

/**
 * Emit a new grievance to all connected SSE listeners (zone-filtered).
 */
async function emitGrievance() {
    if (listeners.size === 0) return; // Save resources if nobody is watching

    const { grievance, scored } = generateGrievance();

    // Persist to database
    await persistGrievance(grievance);

    // Add to in-memory buffer
    buffer.push(grievance);
    totalIngested++;

    // Enforce rolling buffer max
    if (buffer.length > BUFFER_MAX) {
        buffer = buffer.slice(buffer.length - BUFFER_MAX);
    }

    // Build the top 5 issues from buffer
    const topIssuesNow = [...buffer]
        .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
        .slice(0, 5)
        .map((g) => ({
            id: g.id,
            title: g.title,
            region: g.region,
            score: g.priorityScore,
            label: g.priorityLabel,
            issueType: g.issueType,
        }));

    const payload = {
        type: "new-grievance",
        grievance: {
            id: grievance.id,
            title: grievance.title,
            region: grievance.region,
            category: grievance.category,
            issueType: grievance.issueType,
            complaintsCount: grievance.complaintsCount,
            daysPending: grievance.daysPending,
            sentimentSeverity: grievance.sentimentSeverity,
            escalationRisk: grievance.escalationRisk,
            score: scored.score,
            label: scored.label,
            confidence: scored.confidence,
        },
        totalCount: totalIngested,
        topIssuesNow,
        timestamp: new Date().toISOString(),
    };

    // Broadcast to each listener (zone-filtered)
    for (const [res, meta] of listeners) {
        try {
            // Zone filtering: officers only see their region
            if (meta.zone && !grievance.region.includes(meta.zone)) {
                continue; // Skip — grievance not in this officer's zone
            }
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch {
            // Connection broken — will be cleaned up
            listeners.delete(res);
        }
    }
}

/**
 * Schedule the next emission with adaptive interval.
 */
function scheduleNext() {
    if (!isRunning) return;

    const interval = listeners.size >= 2 ? FAST_INTERVAL : BASE_INTERVAL;
    emissionTimer = setTimeout(async () => {
        await emitGrievance();
        scheduleNext();
    }, interval);
}

/**
 * Clean up old buffer entries (hourly).
 */
function startCleanupCycle() {
    cleanupTimer = setInterval(() => {
        if (buffer.length > BUFFER_MAX) {
            const removed = buffer.length - BUFFER_MAX;
            buffer = buffer.slice(removed);
            console.log(`🧹 Live buffer cleanup: removed ${removed} old entries`);
        }
    }, 60 * 60 * 1000); // Every hour
}

// ─── Public API ───

/**
 * Start the live ingestion stream.
 */
function startStream() {
    if (isRunning) return;
    isRunning = true;
    console.log("📡 Live Ingestion Engine started");
    scheduleNext();
    startCleanupCycle();
}

/**
 * Stop the live ingestion stream.
 */
function stopStream() {
    isRunning = false;
    if (emissionTimer) clearTimeout(emissionTimer);
    if (cleanupTimer) clearInterval(cleanupTimer);
    console.log("📡 Live Ingestion Engine stopped");
}

/**
 * Add an SSE listener.
 */
function addListener(res, zone = null, userId = null) {
    listeners.set(res, { zone, userId });
    console.log(`📡 SSE listener added (total: ${listeners.size}, zone: ${zone || "all"})`);
}

/**
 * Remove an SSE listener.
 */
function removeListener(res) {
    listeners.delete(res);
    console.log(`📡 SSE listener removed (total: ${listeners.size})`);
}

/**
 * Get current live stats.
 */
function getStats() {
    const byType = {};
    for (const g of buffer.slice(-100)) {
        byType[g.issueType] = (byType[g.issueType] || 0) + 1;
    }

    return {
        totalIngested,
        activeListeners: listeners.size,
        bufferSize: buffer.length,
        issueTypeBreakdown: byType,
        lastEventAt: buffer.length > 0 ? buffer[buffer.length - 1].ingestedAt : null,
        isRunning,
    };
}

/**
 * Get the current buffer (for initial state on SSE connect).
 */
function getRecentGrievances(limit = 5) {
    return buffer.slice(-limit).reverse().map((g) => ({
        id: g.id,
        title: g.title,
        region: g.region,
        category: g.category,
        issueType: g.issueType,
        complaintsCount: g.complaintsCount,
        daysPending: g.daysPending,
        score: g.priorityScore,
        label: g.priorityLabel,
        ingestedAt: g.ingestedAt,
    }));
}

module.exports = {
    startStream,
    stopStream,
    addListener,
    removeListener,
    getStats,
    getRecentGrievances,
    get totalIngested() { return totalIngested; },
};
