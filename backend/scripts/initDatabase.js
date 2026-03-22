#!/usr/bin/env node

/**
 * Database Initialization & Migration Script
 *
 * Creates schema, indexes, and seeds data from JSON files.
 * Safe to run multiple times (idempotent — uses ON CONFLICT DO NOTHING).
 *
 * Usage: node scripts/initDatabase.js
 */

const path = require("path");
const dotenv = require("dotenv");

// Load env from backend root
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const db = require("../db/connection");
const { loadJSON } = require("../utils/dataLoader");

async function main() {
    console.log("🚀 Starting database initialization...\n");

    // Step 1: Connect and create tables
    const connected = await db.initialize();
    if (!connected) {
        console.error("❌ Cannot proceed without database connection.");
        console.error("   Set DATABASE_URL in your .env file or environment.");
        process.exit(1);
    }

    const pool = db.getPool();

    // Step 2: Seed grievances
    console.log("\n📦 Seeding grievances...");
    const grievances = loadJSON("grievances.json");
    let grievanceCount = 0;

    for (const g of grievances) {
        try {
            await pool.query(
                `INSERT INTO grievances
                    (id, title, description, category, issue_type, region, status,
                     complaints_count, sentiment_severity, days_pending,
                     public_visibility, escalation_risk, source)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    g.id, g.title, g.description, g.category,
                    g.issueType, g.region, g.status || "open",
                    g.complaintsCount, g.sentimentSeverity, g.daysPending,
                    g.publicVisibility, g.escalationRisk, "portal",
                ]
            );
            grievanceCount++;
        } catch (err) {
            console.error(`  ⚠️  Failed to insert ${g.id}: ${err.message}`);
        }
    }
    console.log(`  ✅ ${grievanceCount} grievances seeded`);

    // Step 3: Seed commitments
    console.log("\n📦 Seeding commitments...");
    const commitments = loadJSON("commitments.json");
    let commitmentCount = 0;

    for (const c of commitments) {
        try {
            await pool.query(
                `INSERT INTO commitments (id, title, announced_date, status, days_pending, risk_level)
                 VALUES ($1,$2,$3,$4,$5,$6)
                 ON CONFLICT (id) DO NOTHING`,
                [c.id, c.title, c.announcedDate, c.status, c.daysPending, c.riskLevel]
            );
            commitmentCount++;

            // Seed linked grievance IDs
            if (c.linkedGrievanceIds && c.linkedGrievanceIds.length > 0) {
                for (const gId of c.linkedGrievanceIds) {
                    await pool.query(
                        `INSERT INTO commitment_grievance_links (commitment_id, grievance_id)
                         VALUES ($1, $2)
                         ON CONFLICT DO NOTHING`,
                        [c.id, gId]
                    );
                }
            }
        } catch (err) {
            console.error(`  ⚠️  Failed to insert ${c.id}: ${err.message}`);
        }
    }
    console.log(`  ✅ ${commitmentCount} commitments seeded`);

    // Step 4: Seed media issues
    console.log("\n📦 Seeding media issues...");
    const mediaIssues = loadJSON("media-issues.json");
    let mediaCount = 0;

    for (const m of mediaIssues) {
        try {
            await pool.query(
                `INSERT INTO media_issues (id, headline, sentiment, public_impact_level)
                 VALUES ($1,$2,$3,$4)
                 ON CONFLICT (id) DO NOTHING`,
                [m.id, m.headline, m.sentiment, m.publicImpactLevel]
            );
            mediaCount++;

            // Seed linked grievance IDs
            if (m.linkedGrievanceIds && m.linkedGrievanceIds.length > 0) {
                for (const gId of m.linkedGrievanceIds) {
                    await pool.query(
                        `INSERT INTO media_grievance_links (media_id, grievance_id)
                         VALUES ($1, $2)
                         ON CONFLICT DO NOTHING`,
                        [m.id, gId]
                    );
                }
            }
        } catch (err) {
            console.error(`  ⚠️  Failed to insert ${m.id}: ${err.message}`);
        }
    }
    console.log(`  ✅ ${mediaCount} media issues seeded`);

    // Step 5: Verify
    console.log("\n📊 Verification:");
    const counts = await Promise.all([
        pool.query("SELECT COUNT(*) FROM grievances"),
        pool.query("SELECT COUNT(*) FROM commitments"),
        pool.query("SELECT COUNT(*) FROM media_issues"),
        pool.query("SELECT COUNT(*) FROM commitment_grievance_links"),
        pool.query("SELECT COUNT(*) FROM media_grievance_links"),
    ]);

    console.log(`  Grievances:        ${counts[0].rows[0].count}`);
    console.log(`  Commitments:       ${counts[1].rows[0].count}`);
    console.log(`  Media Issues:      ${counts[2].rows[0].count}`);
    console.log(`  Commitment Links:  ${counts[3].rows[0].count}`);
    console.log(`  Media Links:       ${counts[4].rows[0].count}`);

    console.log("\n✅ Database initialization complete!");

    await db.close();
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Fatal error:", err);
    process.exit(1);
});
