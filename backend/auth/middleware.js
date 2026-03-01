const { v4: uuidv4 } = require("uuid");
const users = require("./users");

// In-memory session store: token → userId
const sessions = new Map();

const auditLogs = [];

// ── Seed demo data for hackathon MVP ──────────────────────────────────
const DEMO_USERS = [
    { id: "user-admin-1", name: "Rajesh Kumar", role: "admin" },
    { id: "user-officer-east", name: "Priya Sharma", role: "officer" },
    { id: "user-officer-west", name: "Vikram Singh Tomar", role: "officer" },
    { id: "user-officer-north", name: "Anjali Gupta", role: "officer" },
    { id: "user-officer-central", name: "Suresh Yadav", role: "officer" },
    { id: "user-officer-south", name: "Kavita Reddy", role: "officer" },
    { id: "user-leader-south", name: "Dr. Meena Chaudhary", role: "leader" },
    { id: "user-leader-west", name: "Arun Jaitley Jr.", role: "leader" },
    { id: "user-leader-north", name: "Sunita Devi", role: "leader" },
    { id: "user-leader-east", name: "Rakesh Mehta", role: "leader" },
    { id: "user-leader-central", name: "Dinesh Mohan", role: "leader" },
];

const DEMO_ACTIONS = [
    "VIEW_ISSUES", "VIEW_ISSUES", "VIEW_ISSUES",
    "VIEW_COMMITMENTS", "VIEW_COMMITMENTS",
    "VIEW_BRIEF",
    "VIEW_STATISTICS", "VIEW_STATISTICS",
    "ASK_QUERY",
    "VIEW_AUDIT_LOGS",
];

const DEMO_IPS = [
    "10.12.45.102", "10.12.45.108", "10.12.46.55",
    "192.168.1.34", "192.168.1.78", "192.168.2.11",
    "172.16.0.45", "172.16.0.92", "10.0.3.201",
    "203.115.78.14", "49.36.124.88",
];

function generateSeedData() {
    const entries = [];
    const now = new Date();

    // Build "start of today" so we never generate future timestamps
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const DAY = 86400000;

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
        // Start of the target day (midnight)
        const dayStart = new Date(todayStart.getTime() - (dayOffset * DAY));

        // For today, cap to current hour; for past days, use full business hours
        let maxHour;
        if (dayOffset === 0) {
            maxHour = Math.min(now.getHours(), 18); // up to current hour or 6PM
            if (maxHour < 9) continue; // skip today if it's before 9AM
        } else {
            maxHour = 18; // past days go up to 6PM
        }

        // Pick 4-8 active users for this day
        const activeCount = 4 + Math.floor(Math.random() * 5);
        const shuffled = [...DEMO_USERS].sort(() => Math.random() - 0.5);
        const activeUsers = shuffled.slice(0, activeCount);

        for (const user of activeUsers) {
            const numActions = 1 + Math.floor(Math.random() * 4);
            for (let a = 0; a < numActions; a++) {
                let action = DEMO_ACTIONS[Math.floor(Math.random() * DEMO_ACTIONS.length)];
                // Role-appropriate actions
                if (user.role === "leader" && action === "VIEW_AUDIT_LOGS") action = "VIEW_ISSUES";
                if (user.role === "officer" && action === "VIEW_AUDIT_LOGS") action = "VIEW_ISSUES";
                if (user.role === "officer" && action === "VIEW_BRIEF") action = "VIEW_COMMITMENTS";

                const hour = 9 + Math.floor(Math.random() * (maxHour - 9 + 1));
                const minute = Math.floor(Math.random() * 60);
                const second = Math.floor(Math.random() * 60);

                const ts = new Date(dayStart);
                ts.setHours(hour, minute, second);

                // Ensure not in the future
                if (ts.getTime() > now.getTime()) continue;

                entries.push({
                    id: uuidv4(),
                    userId: user.id,
                    userName: user.name,
                    role: user.role,
                    action,
                    timestamp: ts.toISOString(),
                    ip: DEMO_IPS[Math.floor(Math.random() * DEMO_IPS.length)],
                });
            }
        }
    }

    entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return entries;
}

// Initial seed on startup
auditLogs.push(...generateSeedData());

function authenticate(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.slice(7);
    const userId = sessions.get(token);

    if (!userId) {
        return res.status(401).json({ error: "Invalid or expired session" });
    }

    const user = users.find((u) => u.id === userId);

    if (!user) {
        return res.status(401).json({ error: "Unknown user" });
    }

    req.user = user;
    next();
}

function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        next();
    };
}

function auditLog(action) {
    return (req, res, next) => {
        auditLogs.push({
            id: uuidv4(),
            userId: req.user.id,
            userName: req.user.name,
            role: req.user.role,
            action,
            timestamp: new Date().toISOString(),
            ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
        });

        next();
    };
}

module.exports = { authenticate, authorize, auditLog, auditLogs, generateSeedData, sessions };
