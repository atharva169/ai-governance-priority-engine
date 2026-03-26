/**
 * Live Stream Route — SSE Endpoint
 *
 * GET /api/live-stream — Opens persistent SSE connection for real-time grievance feed.
 * GET /api/live-stream/stats — Returns current live feed statistics.
 *
 * Authentication: x-user-id header (maps to users in auth store).
 * Zone filtering: officers only see grievances from their constituency.
 */

const express = require("express");
const users = require("../auth/users");
const liveEngine = require("../engine/liveIngestionEngine");
const { getZoneTrends } = require("../engine/sentimentEngine");
const { auditLogs } = require("../auth/middleware");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

/**
 * Resolve user from x-user-id header.
 */
function resolveUser(req) {
    const userId = req.headers["x-user-id"] || req.query.userId;
    if (!userId) return null;
    return users.find((u) => u.id === userId) || null;
}

/**
 * Get zone filter for a user.
 */
function getUserZone(user) {
    if (!user || !user.constituencyName) return null;
    if (user.constituencyName === "All Delhi") return null; // admin sees all
    return user.constituencyName;
}

/**
 * SSE endpoint — persistent connection for real-time grievance feed.
 */
router.get("/", (req, res) => {
    const user = resolveUser(req);
    if (!user) {
        return res.status(401).json({ error: "Missing or invalid x-user-id header" });
    }

    const zone = getUserZone(user);

    // SSE headers
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
    });

    // Send initial state
    const initialData = {
        type: "init",
        totalCount: liveEngine.getStats().totalIngested,
        recentGrievances: liveEngine.getRecentGrievances(5),
        stats: liveEngine.getStats(),
        zoneSentimentTrends: getZoneTrends(),
        timestamp: new Date().toISOString(),
    };
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);

    // Register listener with zone filter
    liveEngine.addListener(res, zone, user.id);

    // Audit log
    auditLogs.push({
        id: uuidv4(),
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: "LIVE_STREAM_CONNECT",
        timestamp: new Date().toISOString(),
        ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
    });

    // Heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
        try {
            res.write(`data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`);
        } catch {
            clearInterval(heartbeat);
        }
    }, 30000);

    // Cleanup on disconnect
    req.on("close", () => {
        clearInterval(heartbeat);
        liveEngine.removeListener(res);

        auditLogs.push({
            id: uuidv4(),
            userId: user.id,
            userName: user.name,
            role: user.role,
            action: "LIVE_STREAM_DISCONNECT",
            timestamp: new Date().toISOString(),
            ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
        });
    });
});

/**
 * GET /api/live-stream/stats — Current live feed statistics.
 * Uses standard auth (x-user-id header).
 */
router.get("/stats", (req, res) => {
    const user = resolveUser(req);
    if (!user) {
        return res.status(401).json({ error: "Missing or invalid x-user-id header" });
    }

    res.json(liveEngine.getStats());
});

module.exports = router;
