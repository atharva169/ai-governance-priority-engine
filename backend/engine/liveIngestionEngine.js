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
const { analyzeSentiment, recordZoneSentiment, getZoneTrends } = require("./sentimentEngine");
const db = require("../db/connection");

// ─── Zone-Specific Grievance Templates ───
// Each zone has unique, hyper-local grievances with realistic details.

const ZONE_TEMPLATES = {
    "North Delhi": [
        { title: "Broken sewer line flooding 40+ homes in Narela Sector A7", category: "Sanitation", issueType: "life-safety", desc: "A ruptured main sewer pipe has displaced families for 5 days. Raw sewage is entering ground-floor rooms. MCD repair crew dispatched but unable to locate the rupture point.", severity: "high" },
        { title: "Illegal dumping of industrial waste near Wazirabad waterworks", category: "Environment", issueType: "life-safety", desc: "Chemical drums found abandoned near Wazirabad water treatment inlet. DJB has flagged potential contamination of drinking water supply to 3 lakh households.", severity: "high" },
        { title: "Fire exit blocked by encroachments in Rohini Sector 11 market", category: "Public Safety", issueType: "life-safety", desc: "Illegal building extensions have narrowed the fire access lane to less than 2 metres. Fire tenders cannot pass. Fire department issued critical risk notice after inspection.", severity: "high" },
        { title: "Garbage dump overflow near GTB Nagar metro station", category: "Sanitation", issueType: "life-safety", desc: "Municipal dhalao not cleared for 12 days. Waste spilling onto main road attracting rodents. Nearby shopkeepers forced to close due to unbearable stench.", severity: "medium" },
        { title: "Contaminated borewell water in Jahangirpuri Block C-D", category: "Water Supply", issueType: "life-safety", desc: "Lab tests confirm coliform bacteria in community borewells. Three children hospitalised with gastroenteritis this week. DJB tanker supply remains erratic.", severity: "high" },
        { title: "Stalled construction of Narela community health centre", category: "Healthcare Infrastructure", issueType: "essential-service", desc: "The health centre sanctioned 14 months ago stuck at 30% completion. Nearest hospital is 8 km away. Pregnant women in the area lack emergency access.", severity: "medium" },
        { title: "Broken streetlights on Pitampura Ring Road stretch", category: "Municipal Services", issueType: "amenity", desc: "18 streetlights non-functional on the 1.5 km stretch between Pitampura metro and Wazirpur depot. Two chain-snatching incidents reported this week.", severity: "low" },
        { title: "Waterlogging in Burari underpass after brief rainfall", category: "Infrastructure", issueType: "infrastructure", desc: "Burari underpass accumulates 3 feet of water after even mild rain. Vehicles stranded for hours. Drainage pumps installed last year are non-functional.", severity: "medium" },
        { title: "Pension payments delayed 4 months for Alipur ward seniors", category: "Social Welfare", issueType: "essential-service", desc: "89 senior citizens in Alipur ward have not received old-age pension since November. Helpline remains unresponsive despite 200+ complaint calls.", severity: "medium" },
        { title: "Stray cattle blocking NH-44 service road near Singhu border", category: "Roads & Transport", issueType: "infrastructure", desc: "Abandoned dairy cattle roaming on the service road causing daily accidents. Three two-wheeler collisions this month. MCD animal control unresponsive.", severity: "medium" },
        { title: "Overflowing Najafgarh drain near Bawana industrial area", category: "Environment", issueType: "life-safety", desc: "Untreated effluent from 40+ factories entering the drain. Residents in adjacent colony report skin rashes and respiratory issues. DPCC notice ignored.", severity: "high" },
        { title: "CCTV cameras non-functional across Model Town market", category: "Public Safety", issueType: "amenity", desc: "11 out of 16 surveillance cameras offline for 6 weeks. Two robbery incidents in the market last month. RWA demanding immediate repair.", severity: "low" },
    ],

    "South Delhi": [
        { title: "Dengue outbreak linked to stagnant drain in Mehrauli village", category: "Public Health", issueType: "life-safety", desc: "42 confirmed dengue cases in past 2 weeks traced to a blocked storm drain near the heritage area. Vector control team has not conducted fogging.", severity: "high" },
        { title: "Sewage overflow flooding Okhla Phase 2 residential blocks", category: "Sanitation", issueType: "life-safety", desc: "Raw sewage entering ground-floor homes in Block F. Residents displaced to relatives' houses. MCD says contractor dispute delaying repair.", severity: "high" },
        { title: "Irregular garbage collection in Sangam Vihar colony", category: "Sanitation", issueType: "essential-service", desc: "Collection reduced to once weekly instead of daily. Open waste piles on every street corner. Stray dogs and rats multiplying. Respiratory complaints rising.", severity: "medium" },
        { title: "Encroachment blocking cycle track on BRT corridor, Chirag Delhi", category: "Roads & Transport", issueType: "infrastructure", desc: "Street vendors and parked vehicles have completely blocked the designated cycle track. Cyclists forced onto main road. Two accidents this week.", severity: "medium" },
        { title: "Mosquito breeding in clogged drain near Saket metro station", category: "Public Health", issueType: "life-safety", desc: "Standing water in the open drain behind Saket mall has become a breeding ground. 15 malaria cases reported in surrounding residential blocks.", severity: "high" },
        { title: "Broken footpath tiles causing falls on Hauz Khas Village road", category: "Roads & Transport", issueType: "infrastructure", desc: "Uneven and shattered pavement tiles on the main pedestrian road. An elderly woman fractured her hip last Tuesday. Tourist footfall at risk.", severity: "medium" },
        { title: "Community park in Vasant Kunj D-block vandalised", category: "Municipal Services", issueType: "amenity", desc: "Playground equipment dismantled by scrap thieves. Benches uprooted. Walking track damaged. 800+ families depend on this park for recreation.", severity: "low" },
        { title: "RO water plant shutdown at Sangam Vihar community centre", category: "Water Supply", issueType: "essential-service", desc: "The RO plant has been non-functional for 60 days. Over 1,200 families now depend on untreated borewell water. Maintenance contractor absconding.", severity: "medium" },
        { title: "Noise pollution from illegal banquet hall in Greater Kailash", category: "Environment", issueType: "amenity", desc: "Residents report nightly DJ music exceeding 80dB until 2 AM. DPCC orders ignored. Multiple written complaints to SDM office unanswered.", severity: "low" },
        { title: "Pothole cluster on Mehrauli-Badarpur road near Sarita Vihar", category: "Roads & Transport", issueType: "infrastructure", desc: "17 deep potholes on a 500-metre stretch. A tempo overturned last week injuring 3 passengers. PWD has not responded to ward councillor's letter.", severity: "medium" },
        { title: "Crumbling boundary wall of government school in Malviya Nagar", category: "Education Infrastructure", issueType: "life-safety", desc: "Cracks widening daily in the compound wall. 350 students attend the school. Principal has written 4 letters to the education department. No response.", severity: "high" },
        { title: "Stray dog menace near Ambedkar Nagar primary school", category: "Public Safety", issueType: "life-safety", desc: "Pack of aggressive strays attacked 2 children this month near the school gate. Parents keeping children home. MCD animal control team yet to visit.", severity: "high" },
    ],

    "East Delhi": [
        { title: "Daily 6-hour power cuts across Trilokpuri blocks 25-32", category: "Power Supply", issueType: "essential-service", desc: "Transformer overloading causing prolonged blackouts. Summer temperatures rising. Three heat-stroke cases among elderly residents reported this week.", severity: "medium" },
        { title: "Collapsed boundary wall of government school in Patparganj", category: "Education Infrastructure", issueType: "life-safety", desc: "The compound wall collapsed during heavy rain last week. School shut since then. 400 students affected. Structural assessment pending for 10 days.", severity: "high" },
        { title: "Damaged footpath and missing railing on Vikas Marg flyover", category: "Roads & Transport", issueType: "infrastructure", desc: "Pedestrian footpath on the west side is broken with missing railing sections. Two pedestrian falls reported. NDMC has not acknowledged the complaint.", severity: "medium" },
        { title: "RO water plant broken at Mayur Vihar Phase 3 community centre", category: "Water Supply", issueType: "essential-service", desc: "Community RO plant non-functional for 45 days. 800+ families now buying packaged water. Maintenance contractor unreachable. DJB says not their jurisdiction.", severity: "medium" },
        { title: "Delayed pension disbursement for Shahdara district seniors", category: "Social Welfare", issueType: "essential-service", desc: "Over 1,200 beneficiaries have not received old-age pension for three consecutive months. District office helpline perpetually engaged.", severity: "medium" },
        { title: "Irregular water supply in Laxmi Nagar — 45 minutes per day", category: "Water Supply", issueType: "essential-service", desc: "Multiple households report water supply limited to 45 minutes daily, down from 3 hours. Tanker dependency tripled. DJB blames low pressure in the trunk main.", severity: "medium" },
        { title: "Open drain overflowing near Preet Vihar market", category: "Sanitation", issueType: "life-safety", desc: "Uncovered municipal drain has been overflowing for 9 days. Raw sewage on shop frontages. 6 shops forced to close. MCD says desilting crew unavailable.", severity: "high" },
        { title: "Gas leak near LPG godown in Pandav Nagar industrial area", category: "Public Safety", issueType: "life-safety", desc: "Workers in adjacent units report strong gas odour since morning. Fire brigade alerted but not yet arrived. 200+ workers evacuated as precaution.", severity: "high" },
        { title: "Pothole-ridden road near Anand Vihar ISBT causing accidents", category: "Roads & Transport", issueType: "infrastructure", desc: "12 deep potholes on approach road to the bus terminal. An auto-rickshaw overturned yesterday injuring 4 passengers. Heavy vehicle traffic worsens damage daily.", severity: "medium" },
        { title: "Broken traffic signal at Vikas Marg-Laxmi Nagar crossing", category: "Roads & Transport", issueType: "infrastructure", desc: "Signal non-functional for 2 weeks at one of East Delhi's busiest intersections. Traffic jams exceeding 45 minutes during peak hours. 3 minor collisions reported.", severity: "medium" },
        { title: "Mosquito breeding in Yamuna bank colony, Geeta Colony", category: "Public Health", issueType: "life-safety", desc: "Stagnant rainwater pools in the low-lying colony attracting Aedes mosquitoes. 18 dengue cases in 10 days. No fogging or larvicide spraying done despite requests.", severity: "high" },
        { title: "Illegal parking blocking ambulance access in Krishna Nagar", category: "Healthcare", issueType: "life-safety", desc: "Cars parked on both sides of the lane leading to the community clinic. Ambulance took 35 minutes to reach a cardiac emergency last Thursday.", severity: "high" },
    ],

    "West Delhi": [
        { title: "Persistent waterlogging in Dwarka Sector 12 main road", category: "Infrastructure", issueType: "infrastructure", desc: "Every rainfall event floods the road for 6+ hours. Drainage infrastructure is 15 years old and undersized for current population. Rs 80 crore overhaul promised but stalled.", severity: "medium" },
        { title: "DTC bus route cancellation stranding 5,000 Najafgarh commuters", category: "Public Transport", issueType: "essential-service", desc: "Three bus routes abruptly cancelled due to fleet shortage. Daily commuters left with no public transport. Auto-rickshaw fares have doubled in the area.", severity: "medium" },
        { title: "Flooding in Janakpuri C-Block underpass — electrocution risk", category: "Infrastructure", issueType: "life-safety", desc: "The underpass floods with every rain. Submerged electrical cables pose electrocution hazard. Two motorcyclists were electrocuted last monsoon season.", severity: "high" },
        { title: "Stray dog attacks near Dwarka Sector 7 primary school", category: "Public Safety", issueType: "life-safety", desc: "Pack of stray dogs attacked 3 schoolchildren in the past month. Parents keeping children home. School attendance dropped 40%. MCD animal control unresponsive.", severity: "high" },
        { title: "Gas pipeline leak near residential colony in Dwarka Sector 23", category: "Public Safety", issueType: "life-safety", desc: "Strong gas odour reported near Sector 23 market. IGL notified 48 hours ago but repair team has not arrived. 50+ families have self-evacuated.", severity: "high" },
        { title: "Broken playground equipment injuring children in Tilak Nagar park", category: "Municipal Services", issueType: "amenity", desc: "Rusted and broken swings have caused injuries to two children this month. Parents demand immediate removal. MCD maintenance request pending 6 weeks.", severity: "low" },
        { title: "Overloaded transformer sparking in Moti Nagar residential block", category: "Power Supply", issueType: "life-safety", desc: "Distribution transformer running at 160% capacity. Visible sparking at night. BSES says replacement scheduled but no timeline. 200 flats at fire risk.", severity: "high" },
        { title: "Waterlogging at Palam flyover disrupting airport traffic", category: "Infrastructure", issueType: "infrastructure", desc: "Airport-bound traffic regularly blocked for 2+ hours during rain. PWD pump installed last year is defunct. Airlines report rise in passenger missed-flight complaints.", severity: "medium" },
        { title: "Contaminated tap water in Uttam Nagar west blocks", category: "Water Supply", issueType: "life-safety", desc: "Brownish water with sediment from municipal taps since last week. Lab tests pending. 6 children in the area hospitalised with diarrhoea. DJB says flushing scheduled.", severity: "high" },
        { title: "Encroachment on footpath near Janakpuri West metro station", category: "Roads & Transport", issueType: "infrastructure", desc: "Vendors occupying entire footpath forcing pedestrians onto busy road. Visually impaired resident fell into open drain last week. DMRC and MCD blame each other.", severity: "medium" },
        { title: "Broken sewer cover on Najafgarh main road", category: "Roads & Transport", issueType: "life-safety", desc: "Manhole cover missing on a busy stretch. A cyclist fell in at night sustaining fractures. Temporary barricade removed by morning traffic. Repeated complaints ignored.", severity: "high" },
        { title: "School bus route hazard due to Dwarka Expressway construction", category: "Roads & Transport", issueType: "infrastructure", desc: "Ongoing expressway work without proper diversions forcing school buses onto unsafe kutcha detours. Parents demand alternate route but contractor refuses.", severity: "medium" },
    ],

    "Central Delhi": [
        { title: "Ambulance delay of 40 minutes in densely packed Chandni Chowk", category: "Healthcare", issueType: "life-safety", desc: "Narrow lanes and illegal encroachments causing severe ambulance delays. A cardiac patient died waiting for an ambulance last week. Family demanding FIR against encroachers.", severity: "high" },
        { title: "Structural cracks in government school building, Karol Bagh", category: "Education Infrastructure", issueType: "life-safety", desc: "Wide cracks appearing in 3 classrooms of the Boys Senior Secondary School. Engineers flagged as 'unsafe for occupation'. 120 students withdrawn by parents.", severity: "high" },
        { title: "Open manholes on Ring Road near ITO junction", category: "Roads & Transport", issueType: "life-safety", desc: "Four manholes with missing covers on a high-speed stretch. A two-wheeler rider fell into one last week sustaining serious spinal injuries. NDMC unresponsive.", severity: "high" },
        { title: "Late-night construction noise violating DPCC limits near CP", category: "Environment", issueType: "amenity", desc: "Continuous jackhammer noise from 11 PM to 5 AM near Connaught Place inner circle. 200+ residents' sleep disrupted daily. No action despite written DPCC complaint.", severity: "low" },
        { title: "Overcrowding at Rajiv Chowk metro — platform crush risk", category: "Public Transport", issueType: "life-safety", desc: "Peak-hour overcrowding has caused 3 near-stampede situations this month. Platform management grossly inadequate. DMRC claims staffing shortfall.", severity: "high" },
        { title: "Sewage leak contaminating Jama Masjid area food street", category: "Public Health", issueType: "life-safety", desc: "Leaking sewer pipe under the famous food street. Raw sewage seeping into shop basements. Health inspector reports gastro cases spike but MCD denies any leak.", severity: "high" },
        { title: "Traffic signal malfunction at Minto Bridge causing gridlock", category: "Roads & Transport", issueType: "infrastructure", desc: "Signal stuck on red for all directions for 3 days. Traffic police manually managing but causing 30-minute delays. PMU says replacement part awaited from Pune.", severity: "medium" },
        { title: "Pension arrears of 5 months for widows in Daryaganj ward", category: "Social Welfare", issueType: "essential-service", desc: "67 widow pension beneficiaries have not received payment since October. Many are sole earners. District women welfare officer says file pending at State level.", severity: "medium" },
        { title: "Broken lift in multi-storey CGHS flats, Connaught Place", category: "Municipal Services", issueType: "amenity", desc: "Only working lift in 8-storey block broken for 3 weeks. 15 elderly and 4 wheelchair-bound residents unable to leave their flats. RWA exhausted its repair fund.", severity: "low" },
        { title: "Illegal hawker encroachment near Patel Chowk metro exit", category: "Roads & Transport", issueType: "infrastructure", desc: "50+ hawkers blocking the metro exit path and pedestrian crossing. Commuters forced to walk on the road. NDMC anti-encroachment drive announced but not executed.", severity: "medium" },
        { title: "Fire hydrant non-functional in Paharganj hotel district", category: "Public Safety", issueType: "life-safety", desc: "32 fire hydrants in the congested hotel area found non-functional during surprise inspection. Last fire killed 17 people. DJB says water pressure insufficient.", severity: "high" },
        { title: "Contaminated food stalls near RML Hospital, New Delhi", category: "Public Health", issueType: "amenity", desc: "Unlicensed vendors using recycled cooking oil near the hospital gate. Two food poisoning cases traced to the stalls. FSSAI notice issued but no follow-up.", severity: "low" },
    ],
};

// Flatten all regions into a lookup
const ALL_REGIONS = Object.keys(ZONE_TEMPLATES);
const ZONE_REGION_MAP = {
    "North Delhi": [
        "Narela, North Delhi", "Wazirabad, North Delhi", "Rohini Sector 11, North Delhi",
        "GTB Nagar, North Delhi", "Jahangirpuri, North Delhi", "Pitampura, North Delhi",
        "Burari, North Delhi", "Alipur, North Delhi", "Bawana, North Delhi", "Model Town, North Delhi",
    ],
    "South Delhi": [
        "Mehrauli, South Delhi", "Okhla Phase 2, South Delhi", "Sangam Vihar, South Delhi",
        "Chirag Delhi, South Delhi", "Saket, South Delhi", "Hauz Khas, South Delhi",
        "Vasant Kunj, South Delhi", "Greater Kailash, South Delhi", "Sarita Vihar, South Delhi",
        "Malviya Nagar, South Delhi", "Ambedkar Nagar, South Delhi",
    ],
    "East Delhi": [
        "Trilokpuri, East Delhi", "Patparganj, East Delhi", "Mayur Vihar Phase 3, East Delhi",
        "Shahdara, East Delhi", "Laxmi Nagar, East Delhi", "Preet Vihar, East Delhi",
        "Pandav Nagar, East Delhi", "Anand Vihar, East Delhi", "Geeta Colony, East Delhi",
        "Krishna Nagar, East Delhi",
    ],
    "West Delhi": [
        "Dwarka Sector 12, West Delhi", "Najafgarh, West Delhi", "Janakpuri, West Delhi",
        "Dwarka Sector 7, West Delhi", "Dwarka Sector 23, West Delhi", "Tilak Nagar, West Delhi",
        "Moti Nagar, West Delhi", "Palam, West Delhi", "Uttam Nagar, West Delhi",
    ],
    "Central Delhi": [
        "Chandni Chowk, Central Delhi", "Karol Bagh, Central Delhi", "ITO, Central Delhi",
        "Connaught Place, Central Delhi", "Rajiv Chowk, Central Delhi", "Jama Masjid, Central Delhi",
        "Minto Bridge, Central Delhi", "Daryaganj, Central Delhi", "Paharganj, Central Delhi",
        "Patel Chowk, Central Delhi",
    ],
};

// Severity presets for correlated, realistic metrics
const SEVERITY_PRESETS = {
    high: {
        complaintsCount: () => 180 + Math.floor(Math.random() * 320),     // 180-500
        sentimentSeverity: () => 4 + Math.floor(Math.random() * 2),       // 4-5
        daysPending: () => 3 + Math.floor(Math.random() * 43),            // 3-45  (urgent issues noticed quickly)
        publicVisibility: () => 3 + Math.floor(Math.random() * 3),        // 3-5
        escalationRisk: () => 3 + Math.floor(Math.random() * 3),          // 3-5
    },
    medium: {
        complaintsCount: () => 80 + Math.floor(Math.random() * 250),      // 80-330
        sentimentSeverity: () => 2 + Math.floor(Math.random() * 3),       // 2-4
        daysPending: () => 10 + Math.floor(Math.random() * 81),           // 10-90  (building pressure over time)
        publicVisibility: () => 2 + Math.floor(Math.random() * 3),        // 2-4
        escalationRisk: () => 2 + Math.floor(Math.random() * 3),          // 2-4
    },
    low: {
        complaintsCount: () => 8 + Math.floor(Math.random() * 55),        // 8-63
        sentimentSeverity: () => 1 + Math.floor(Math.random() * 2),       // 1-2
        daysPending: () => 7 + Math.floor(Math.random() * 54),            // 7-60  (slow-burn nuisances)
        publicVisibility: () => 1 + Math.floor(Math.random() * 2),        // 1-2
        escalationRisk: () => 1 + Math.floor(Math.random() * 2),          // 1-2
    },
};

// ─── State ───
const listeners = new Map(); // res → { zone, userId }
let buffer = []; // Rolling buffer of live grievances
let emissionTimer = null;
let cleanupTimer = null;
let totalIngested = 312; // Start with a realistic base count
let isRunning = false;
let lastUsedTemplateIndex = {}; // Track per-zone to avoid repeats

const BUFFER_MAX = 5000;
const BASE_INTERVAL = 30000; // 30s with 1 listener
const FAST_INTERVAL = 15000; // 15s with 2+ listeners

// ─── Core Functions ───

/**
 * Generate a single realistic, zone-specific grievance.
 */
function generateGrievance() {
    // Pick a random zone
    const zone = ALL_REGIONS[Math.floor(Math.random() * ALL_REGIONS.length)];
    const templates = ZONE_TEMPLATES[zone];
    const regions = ZONE_REGION_MAP[zone];

    // Pick a template, avoiding immediate repeats within the same zone
    let templateIdx;
    do {
        templateIdx = Math.floor(Math.random() * templates.length);
    } while (templates.length > 2 && templateIdx === lastUsedTemplateIndex[zone]);
    lastUsedTemplateIndex[zone] = templateIdx;

    const template = templates[templateIdx];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const timestamp = Date.now();
    const shortId = uuidv4().split("-")[0];
    const preset = SEVERITY_PRESETS[template.severity] || SEVERITY_PRESETS.medium;

    // ─── NLP Sentiment Analysis ───
    // Analyze the actual grievance text instead of using static random values
    const nlpResult = analyzeSentiment(template.desc);

    const grievance = {
        id: `GRV-LIVE-${timestamp}-${shortId}`,
        title: template.title,
        description: template.desc,
        category: template.category,
        issueType: template.issueType,
        region: region,
        status: "open",
        complaintsCount: preset.complaintsCount(),
        sentimentSeverity: nlpResult.severity, // NLP-computed instead of random
        daysPending: preset.daysPending(),
        publicVisibility: preset.publicVisibility(),
        escalationRisk: preset.escalationRisk(),
        source: "live-portal",
        ingestedAt: new Date().toISOString(),
        // NLP sentiment metadata
        nlpSentiment: {
            rawScore: nlpResult.rawScore,
            comparative: nlpResult.comparative,
            severity: nlpResult.severity,
            label: nlpResult.label,
            emoji: nlpResult.emoji,
            keywords: nlpResult.keywords,
        },
    };

    // Record sentiment for zone trend tracking
    recordZoneSentiment(region, nlpResult.severity, nlpResult.comparative);

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
            nlpSentiment: grievance.nlpSentiment,
        },
        totalCount: totalIngested,
        topIssuesNow,
        zoneSentimentTrends: getZoneTrends(),
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
        sentimentSeverity: g.sentimentSeverity,
        escalationRisk: g.escalationRisk,
        score: g.priorityScore,
        label: g.priorityLabel,
        ingestedAt: g.ingestedAt,
        nlpSentiment: g.nlpSentiment || null,
    }));
}

/**
 * Get NLP sentiment keywords from recent buffer entries.
 * Used by the sentiment route to aggregate top anger keywords.
 */
function getRecentSentimentKeywords(limit = 50) {
    return buffer.slice(-limit)
        .filter(g => g.nlpSentiment && g.nlpSentiment.keywords)
        .map(g => g.nlpSentiment.keywords);
}

/**
 * Get ALL live-generated grievances in the same shape as grievances.json
 * entries, so they can be merged into the issues API response.
 */
function getLiveGrievances() {
    return buffer.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        issueType: g.issueType,
        region: g.region,
        status: g.status,
        complaintsCount: g.complaintsCount,
        sentimentSeverity: g.sentimentSeverity,
        daysPending: g.daysPending,
        publicVisibility: g.publicVisibility,
        escalationRisk: g.escalationRisk,
        source: g.source, // "live-portal"
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
    getRecentSentimentKeywords,
    getLiveGrievances,
    get totalIngested() { return totalIngested; },
};
