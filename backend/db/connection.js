/**
 * PostgreSQL Connection Pool
 *
 * Manages a shared connection pool to PostgreSQL.
 * Reads DATABASE_URL from environment. Supports SSL for production (Render).
 */

const { Pool } = require("pg");

let pool = null;
let isConnected = false;

/**
 * Initialize the database connection pool and create tables if needed.
 */
async function initialize() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.warn("⚠️  DATABASE_URL not set — database features disabled. Using JSON fallback.");
        return false;
    }

    try {
        pool = new Pool({
            connectionString: databaseUrl,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
        });

        // Test the connection
        const client = await pool.connect();
        await client.query("SELECT NOW()");
        client.release();

        console.log("✅ Database connected successfully");
        isConnected = true;

        // Create tables
        await createTables();

        return true;
    } catch (err) {
        console.error("❌ Database connection failed:", err.message);
        isConnected = false;
        return false;
    }
}

/**
 * Create all required tables and indexes (idempotent).
 */
async function createTables() {
    const queries = [
        // Grievances table
        `CREATE TABLE IF NOT EXISTS grievances (
            id TEXT PRIMARY KEY,
            uuid UUID DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            description TEXT,
            category TEXT,
            issue_type TEXT,
            region TEXT,
            status TEXT DEFAULT 'open',
            complaints_count INTEGER DEFAULT 0,
            sentiment_severity INTEGER DEFAULT 1,
            days_pending INTEGER DEFAULT 0,
            public_visibility INTEGER DEFAULT 1,
            escalation_risk INTEGER DEFAULT 1,
            priority_score REAL,
            priority_label TEXT,
            ai_reasoning TEXT,
            source TEXT DEFAULT 'portal',
            ingested_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            created_by_user_id TEXT,
            last_modified_by_user_id TEXT,
            is_deleted BOOLEAN DEFAULT FALSE
        )`,

        // Commitments table
        `CREATE TABLE IF NOT EXISTS commitments (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            announced_date TEXT,
            status TEXT DEFAULT 'not-started',
            days_pending INTEGER DEFAULT 0,
            risk_level TEXT DEFAULT 'low',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`,

        // Commitment-Grievance links (M2M)
        `CREATE TABLE IF NOT EXISTS commitment_grievance_links (
            commitment_id TEXT REFERENCES commitments(id) ON DELETE CASCADE,
            grievance_id TEXT REFERENCES grievances(id) ON DELETE CASCADE,
            PRIMARY KEY (commitment_id, grievance_id)
        )`,

        // Media issues table
        `CREATE TABLE IF NOT EXISTS media_issues (
            id TEXT PRIMARY KEY,
            headline TEXT NOT NULL,
            sentiment TEXT,
            public_impact_level INTEGER DEFAULT 1,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`,

        // Media-Grievance links (M2M)
        `CREATE TABLE IF NOT EXISTS media_grievance_links (
            media_id TEXT REFERENCES media_issues(id) ON DELETE CASCADE,
            grievance_id TEXT REFERENCES grievances(id) ON DELETE CASCADE,
            PRIMARY KEY (media_id, grievance_id)
        )`,

        // Audit logs table
        `CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id TEXT,
            user_name TEXT,
            role TEXT,
            action TEXT NOT NULL,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            ip TEXT
        )`,

        // Indexes for fast queries
        `CREATE INDEX IF NOT EXISTS idx_grievances_region ON grievances(region)`,
        `CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status)`,
        `CREATE INDEX IF NOT EXISTS idx_grievances_priority ON grievances(priority_score DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_grievances_source ON grievances(source)`,
        `CREATE INDEX IF NOT EXISTS idx_grievances_deleted ON grievances(is_deleted)`,
        `CREATE INDEX IF NOT EXISTS idx_grievances_issue_type ON grievances(issue_type)`,
        `CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`,
    ];

    for (const q of queries) {
        await pool.query(q);
    }

    console.log("✅ Database tables and indexes created");
}

/**
 * Get the connection pool.
 */
function getPool() {
    return pool;
}

/**
 * Check if database is connected.
 */
function isAvailable() {
    return isConnected && pool !== null;
}

/**
 * Close the pool gracefully.
 */
async function close() {
    if (pool) {
        await pool.end();
        isConnected = false;
        console.log("✅ Database pool closed");
    }
}

module.exports = { initialize, getPool, isAvailable, close };
