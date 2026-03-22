/**
 * Database Service Layer
 *
 * Provides async CRUD methods for all database tables.
 * Falls back to JSON file loading when database is unavailable.
 */

const db = require("./connection");
const { loadJSON } = require("../utils/dataLoader");

// ─── Grievance Service ───

class GrievanceService {
    /**
     * Insert a new grievance into the database.
     */
    async create(data) {
        const pool = db.getPool();
        const result = await pool.query(
            `INSERT INTO grievances
                (id, title, description, category, issue_type, region, status,
                 complaints_count, sentiment_severity, days_pending,
                 public_visibility, escalation_risk, priority_score,
                 priority_label, ai_reasoning, source, created_by_user_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
             RETURNING *`,
            [
                data.id, data.title, data.description, data.category,
                data.issueType || data.issue_type, data.region, data.status || "open",
                data.complaintsCount || data.complaints_count || 0,
                data.sentimentSeverity || data.sentiment_severity || 1,
                data.daysPending || data.days_pending || 0,
                data.publicVisibility || data.public_visibility || 1,
                data.escalationRisk || data.escalation_risk || 1,
                data.priorityScore || data.priority_score || null,
                data.priorityLabel || data.priority_label || null,
                data.aiReasoning || data.ai_reasoning || null,
                data.source || "portal",
                data.createdByUserId || null,
            ]
        );
        return this._toCamelCase(result.rows[0]);
    }

    /**
     * Get all non-deleted grievances. Supports optional region filter.
     */
    async getAll(filters = {}) {
        const pool = db.getPool();
        let query = `SELECT * FROM grievances WHERE is_deleted = FALSE`;
        const params = [];
        let idx = 1;

        if (filters.region) {
            query += ` AND region ILIKE $${idx}`;
            params.push(`%${filters.region}%`);
            idx++;
        }

        if (filters.status) {
            query += ` AND status = $${idx}`;
            params.push(filters.status);
            idx++;
        }

        if (filters.issueType) {
            query += ` AND issue_type = $${idx}`;
            params.push(filters.issueType);
            idx++;
        }

        query += ` ORDER BY priority_score DESC NULLS LAST, created_at DESC`;

        const result = await pool.query(query, params);
        return result.rows.map(this._toCamelCase);
    }

    /**
     * Get a single grievance by ID.
     */
    async getById(id) {
        const pool = db.getPool();
        const result = await pool.query(
            `SELECT * FROM grievances WHERE id = $1 AND is_deleted = FALSE`,
            [id]
        );
        return result.rows[0] ? this._toCamelCase(result.rows[0]) : null;
    }

    /**
     * Update a grievance.
     */
    async update(id, updates) {
        const pool = db.getPool();

        const setClauses = [];
        const params = [];
        let idx = 1;

        const fieldMap = {
            title: "title", description: "description", category: "category",
            issueType: "issue_type", region: "region", status: "status",
            complaintsCount: "complaints_count", sentimentSeverity: "sentiment_severity",
            daysPending: "days_pending", publicVisibility: "public_visibility",
            escalationRisk: "escalation_risk", priorityScore: "priority_score",
            priorityLabel: "priority_label", aiReasoning: "ai_reasoning",
        };

        for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
            if (updates[jsKey] !== undefined) {
                setClauses.push(`${dbKey} = $${idx}`);
                params.push(updates[jsKey]);
                idx++;
            }
        }

        if (setClauses.length === 0) return null;

        setClauses.push(`updated_at = NOW()`);
        params.push(id);

        const result = await pool.query(
            `UPDATE grievances SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
            params
        );
        return result.rows[0] ? this._toCamelCase(result.rows[0]) : null;
    }

    /**
     * Get all critical grievances.
     */
    async getCritical() {
        const pool = db.getPool();
        const result = await pool.query(
            `SELECT * FROM grievances
             WHERE priority_label = 'Critical' AND is_deleted = FALSE
             ORDER BY priority_score DESC`
        );
        return result.rows.map(this._toCamelCase);
    }

    /**
     * Get grievances by region.
     */
    async getByRegion(region) {
        const pool = db.getPool();
        const result = await pool.query(
            `SELECT * FROM grievances
             WHERE region ILIKE $1 AND is_deleted = FALSE
             ORDER BY priority_score DESC NULLS LAST`,
            [`%${region}%`]
        );
        return result.rows.map(this._toCamelCase);
    }

    /**
     * Soft-delete a grievance.
     */
    async softDelete(id) {
        const pool = db.getPool();
        await pool.query(
            `UPDATE grievances SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1`,
            [id]
        );
    }

    /**
     * Get total count of non-deleted grievances.
     */
    async getCount() {
        const pool = db.getPool();
        const result = await pool.query(
            `SELECT COUNT(*) as count FROM grievances WHERE is_deleted = FALSE`
        );
        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Convert snake_case DB row to camelCase JS object.
     */
    _toCamelCase(row) {
        if (!row) return null;
        return {
            id: row.id,
            uuid: row.uuid,
            title: row.title,
            description: row.description,
            category: row.category,
            issueType: row.issue_type,
            region: row.region,
            status: row.status,
            complaintsCount: row.complaints_count,
            sentimentSeverity: row.sentiment_severity,
            daysPending: row.days_pending,
            publicVisibility: row.public_visibility,
            escalationRisk: row.escalation_risk,
            priorityScore: row.priority_score,
            priorityLabel: row.priority_label,
            aiReasoning: row.ai_reasoning,
            source: row.source,
            ingestedAt: row.ingested_at,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
            isDeleted: row.is_deleted,
        };
    }
}

// ─── Commitment Service ───

class CommitmentService {
    async create(data) {
        const pool = db.getPool();
        const result = await pool.query(
            `INSERT INTO commitments (id, title, announced_date, status, days_pending, risk_level)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING *`,
            [data.id, data.title, data.announcedDate, data.status, data.daysPending, data.riskLevel]
        );
        return this._toCamelCase(result.rows[0]);
    }

    async getAll() {
        const pool = db.getPool();
        const result = await pool.query(`SELECT * FROM commitments ORDER BY days_pending DESC`);
        return result.rows.map((row) => this._toCamelCase(row));
    }

    async getById(id) {
        const pool = db.getPool();
        const result = await pool.query(`SELECT * FROM commitments WHERE id = $1`, [id]);
        return result.rows[0] ? this._toCamelCase(result.rows[0]) : null;
    }

    /**
     * Get linked grievance IDs for a commitment.
     */
    async getLinkedGrievanceIds(commitmentId) {
        const pool = db.getPool();
        const result = await pool.query(
            `SELECT grievance_id FROM commitment_grievance_links WHERE commitment_id = $1`,
            [commitmentId]
        );
        return result.rows.map((r) => r.grievance_id);
    }

    /**
     * Get all commitments with their linked grievance IDs attached.
     */
    async getAllWithLinks() {
        const pool = db.getPool();
        const commitmentsResult = await pool.query(`SELECT * FROM commitments ORDER BY days_pending DESC`);
        const linksResult = await pool.query(`SELECT * FROM commitment_grievance_links`);

        const linkMap = {};
        for (const link of linksResult.rows) {
            if (!linkMap[link.commitment_id]) linkMap[link.commitment_id] = [];
            linkMap[link.commitment_id].push(link.grievance_id);
        }

        return commitmentsResult.rows.map((row) => ({
            ...this._toCamelCase(row),
            linkedGrievanceIds: linkMap[row.id] || [],
        }));
    }

    _toCamelCase(row) {
        if (!row) return null;
        return {
            id: row.id,
            title: row.title,
            announcedDate: row.announced_date,
            status: row.status,
            daysPending: row.days_pending,
            riskLevel: row.risk_level,
        };
    }
}

// ─── Media Issues Service ───

class MediaIssueService {
    async getAll() {
        const pool = db.getPool();
        const mediaResult = await pool.query(`SELECT * FROM media_issues`);
        const linksResult = await pool.query(`SELECT * FROM media_grievance_links`);

        const linkMap = {};
        for (const link of linksResult.rows) {
            if (!linkMap[link.media_id]) linkMap[link.media_id] = [];
            linkMap[link.media_id].push(link.grievance_id);
        }

        return mediaResult.rows.map((row) => ({
            id: row.id,
            headline: row.headline,
            sentiment: row.sentiment,
            publicImpactLevel: row.public_impact_level,
            linkedGrievanceIds: linkMap[row.id] || [],
        }));
    }
}

// ─── Audit Log Service ───

class AuditLogService {
    async logAction(userId, userName, role, action, ip) {
        if (!db.isAvailable()) return;
        const pool = db.getPool();
        try {
            await pool.query(
                `INSERT INTO audit_logs (user_id, user_name, role, action, ip)
                 VALUES ($1, $2, $3, $4, $5)`,
                [userId, userName, role, action, ip]
            );
        } catch (err) {
            console.error("Audit log insert failed:", err.message);
        }
    }

    async getLogs(filters = {}, limit = 200) {
        const pool = db.getPool();
        let query = `SELECT * FROM audit_logs`;
        const conditions = [];
        const params = [];
        let idx = 1;

        if (filters.userId) {
            conditions.push(`user_id = $${idx++}`);
            params.push(filters.userId);
        }
        if (filters.action) {
            conditions.push(`action = $${idx++}`);
            params.push(filters.action);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(" AND ")}`;
        }

        query += ` ORDER BY timestamp DESC LIMIT $${idx}`;
        params.push(limit);

        const result = await pool.query(query, params);
        return result.rows.map((row) => ({
            id: row.id,
            userId: row.user_id,
            userName: row.user_name,
            role: row.role,
            action: row.action,
            timestamp: row.timestamp,
            ip: row.ip,
        }));
    }
}

// ─── Data Loader (DB-first, JSON-fallback) ───

/**
 * Load grievances from DB if available, else from JSON.
 */
async function loadGrievances() {
    if (db.isAvailable()) {
        const service = new GrievanceService();
        return service.getAll();
    }
    return loadJSON("grievances.json");
}

/**
 * Load commitments with linked grievance IDs from DB or JSON.
 */
async function loadCommitments() {
    if (db.isAvailable()) {
        const service = new CommitmentService();
        return service.getAllWithLinks();
    }
    return loadJSON("commitments.json");
}

/**
 * Load media issues from DB or JSON.
 */
async function loadMediaIssues() {
    if (db.isAvailable()) {
        const service = new MediaIssueService();
        return service.getAll();
    }
    return loadJSON("media-issues.json");
}

// Singleton instances
const grievanceService = new GrievanceService();
const commitmentService = new CommitmentService();
const mediaIssueService = new MediaIssueService();
const auditLogService = new AuditLogService();

module.exports = {
    GrievanceService,
    CommitmentService,
    MediaIssueService,
    AuditLogService,
    grievanceService,
    commitmentService,
    mediaIssueService,
    auditLogService,
    loadGrievances,
    loadCommitments,
    loadMediaIssues,
};
