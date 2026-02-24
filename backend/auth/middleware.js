const { v4: uuidv4 } = require("uuid");
const users = require("./users");

const auditLogs = [];

function authenticate(req, res, next) {
    const userId = req.headers["x-user-id"];

    if (!userId) {
        return res.status(401).json({ error: "Missing x-user-id header" });
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
            role: req.user.role,
            action,
            timestamp: new Date().toISOString(),
        });

        next();
    };
}

module.exports = { authenticate, authorize, auditLog, auditLogs };
