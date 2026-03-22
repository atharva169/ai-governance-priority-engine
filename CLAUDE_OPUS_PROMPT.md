# COMPREHENSIVE SYSTEM PROMPT FOR CLAUDE OPUS 4.5
## Real-Time Grievance Ingestion Pipeline + PostgreSQL Database Integration

---

## **PROJECT CONTEXT**

### **Project Name**: AI Governance Priority & Accountability Engine
**Domain**: Digital Democracy | **Category**: Open Innovation  
**Hackathon**: National-level (India) - competing against 1000 teams

### **Current Status**
- ✅ Frontend: Next.js 16 deployed on **Vercel** (already live)
- ✅ Backend: Node.js/Express deployed on **Render** (already live)  
- ✅ Data: Currently using **JSON files** (grievances.json, commitments.json, media-issues.json)
- ✅ Scoring Engine: Rule-based AI priority scoring (7-factor weighted algorithm)
- ✅ Authentication: Session-simulated with role-based access (admin, officer, leader)

### **Scope of This Task**
Implement **ONLY** these two features:
1. **Feature 1**: Real-Time Grievance Ingestion Pipeline via SSE
2. **Feature 2**: Replace JSON file storage with PostgreSQL database

**DO NOT** touch authentication, scoring engine, frontend structure, or other existing features.

---

## **FEATURE 1: REAL-TIME GRIEVANCE INGESTION PIPELINE**

### **What This Does**
Every 15-30 seconds, a new grievance is **generated**, inserted into the database, and **streamed to all connected browsers** via Server-Sent Events (SSE). The dashboard shows incoming grievances in real-time with animations, auto-updating counters, and re-ranked priorities.

### **Why SSE (Not WebSocket)**
- Server → Client only (judges understand architectural choices)
- Uses standard HTTP (works behind all firewalls)
- Native browser API (no libraries needed)
- Perfect for one-directional live feeds

### **Understanding Complaints vs Grievances (Critical Context)**

**This is what the system actually does** and why generating new grievances every 30 seconds is realistic and meaningful.

#### **Complaint** (Individual Report)
```
Citizen A: "My tube well isn't working"
Citizen B: "No water in my building"
Citizen C: "Water supply cut off for 3 days"
```
Each is ONE complaint. They're individual reports flowing into a government portal.

#### **Grievance** (Systemic Issue Pattern)
```
AGGREGATION ENGINE runs every 30 seconds:
Detects: Multiple complaints from same area + same root cause
Creates: ONE GRIEVANCE record
  Title: "Water supply crisis in East Delhi wards"
  Description: "100+ households in Laxmi Nagar report water cut-off"
  complaintsCount: 267 (aggregated from multiple reports)
  Region: "Laxmi Nagar, East Delhi"
```

#### **Why New Grievances Arrive Every 30 Seconds**

In a real government system:
- **Input**: 100+ complaints arrive per hour from citizens
- **Processing**: Aggregation engine groups similar complaints
- **Output**: Every 30 minutes (we simulate every 30 seconds), new issue patterns are recognized or updated
- **Result**: Officers see emerging patterns instantly, not individual reports

**Example Timeline**:
```
14:00:00
- 15 citizens report "no water in building X"
- Aggregation engine detects pattern
- Creates: GRV-LIVE-1711100000-abc123 "Water crisis Building X"
- System broadcasts to dashboard

14:00:30
- 8 citizens report "road blocked by construction"
- New pattern detected
- Creates: GRV-LIVE-1711100030-def456 "Road obstruction NH-48"
- System broadcasts to dashboard

14:01:00
- Same water issue gets 12 MORE reports
- Existing grievance GRV-LIVE-1711100000-abc123 is UPDATED
- complaintsCount increases: 15 → 27
- Priority recalculated (higher)
- System broadcasts UPDATE to dashboard
```

#### **Why This Impresses Judges**

When judges ask: "Why does a new grievance arrive every 30 seconds?"

You say:
> "A real government portal processes hundreds of citizen complaints daily. Our aggregation engine detects patterns—multiple similar complaints become ONE grievance. Every 30 seconds, we scan for new patterns or updates to existing ones. When detected, they're scored and notified to officers in real-time. The system doesn't act on individual complaints; it acts on systemic issues, which are what officers actually manage."

Judges think: "This team understands real governance workflows." ✅

#### **Key Point for Implementation**

Each NEW grievance arriving represents:
- ✅ A newly detected issue pattern
- ✅ Or an existing issue being updated with new data
- ✅ NOT a random single complaint

So when `liveIngestionEngine.js` generates a grievance every 30 seconds with random metrics, it's simulating a real aggregation engine detecting new patterns or updates in actual citizen data.

### **Architecture**

```
Backend Live Ingestion Engine
├── Generates random grievance every 15-30 sec
├── Inserts into PostgreSQL database
├── Recalculates all priorities via scoring engine
├── Broadcasts to all connected SSE clients
└── Each client updates dashboard in real-time
```

### **Implementation Requirements**

#### **Backend: Live Ingestion Engine**

**File**: `backend/engine/liveIngestionEngine.js`

Requirements:
1. Generate realistic unique grievances every 15-30 seconds (random interval)
2. Include all 12 fields: id, uuid, title, description, category, issueType, region, complaintsCount, sentimentSeverity, daysPending, publicVisibility, escalationRisk
3. Use 28 actual Delhi regions for diversity (not 5)
4. Randomize all numeric values (complaints: 50-450, days pending: 5-155, etc.)
5. Maintain buffer of max 5000 grievances (rolling window - old ones removed)
6. Implement auto-cleanup every hour
7. Only emit if listeners are connected (save resources)
8. Vary emission interval: 30sec if 1 viewer, 15sec if 2+ viewers (faster = cooler)

#### **Backend: SSE Route**

**File**: `backend/routes/liveStream.js`

Requirements:
1. Endpoint: `GET /api/live-stream`
2. Opens persistent HTTP connection with SSE headers
3. Sends initial state (total count, top 5 issues)
4. Broadcasts each new grievance with metadata:
   ```javascript
   {
     type: 'new-grievance',
     grievance: { ...full object... },
     totalCount: number,
     topIssuesNow: [ ...reranked top 5... ],
     timestamp: ISO string
   }
   ```
5. Sends heartbeat every 30 seconds (keeps connection alive)
6. Properly handles client disconnect and cleanup
7. Zone filtering: officers only see their region's grievances
8. Requires authentication (`x-user-id` header)

#### **Backend: Server Integration**

**File**: `backend/server.js` (modifications)

Requirements:
1. Import and start liveIngestionEngine on server startup
2. Add route: `app.use('/api/live-stream', liveStreamRouter)`
3. Start ingestion: `liveIngestionEngine.startStream()`
4. On graceful shutdown: stop stream and close connections

#### **Frontend: Live Stream Hook**

**File**: `frontend/src/hooks/useLiveStream.ts`

Requirements:
1. Hook name: `useLiveStream()`
2. Returns:
   - `updates`: last 10 messages
   - `totalCount`: current grievance count
   - `topIssues`: current top 5 critical issues
   - `isConnected`: boolean
   - `messageRate`: messages per second
3. Opens EventSource to `/api/live-stream`
4. Parses each message and updates state
5. Skips heartbeat messages
6. Handles reconnection on error
7. Cleans up on unmount

#### **Frontend: Live Feed Component**

**File**: `frontend/src/components/LiveFeedPanel.tsx`

Requirements:
1. Displays incoming grievances in real-time
2. Each grievance slides in from top with animation
3. Shows: title, region, priority score, escalation risk
4. Color-coded badge: Critical (red), Attention Required (yellow), Stable (green)
5. Live counter showing total issues with animation
6. Connection status indicator (green dot if connected)
7. Message rate display (e.g., "3 msg/sec")
8. Auto-scrolls to newest grievance
9. Fits into dashboard layout without breaking existing components

#### **Frontend: Animations & Styling**

**File**: `frontend/src/app/globals.css` (add to existing)

Requirements:
1. Animation: `slideInFromTop` (0.5s, easing)
2. Animation: `pulseGlow` (highlight new items)
3. Smooth transitions for counter updates
4. Responsive on mobile (doesn't stack weirdly)

---

## **FEATURE 2: DATABASE INTEGRATION (POSTGRESQL)**

### **Why PostgreSQL (Not SQLite)**
- Render native add-on (1-click setup)
- Persists across restarts
- Efficient indexing (fast queries)
- Scales to millions of records
- Production-ready for hackathon judges

### **Architecture**

```
Data Flow:
JSON files → (one-time migration) → PostgreSQL
   ↓
All new data (live grievances) → PostgreSQL
   ↓
All API routes query PostgreSQL
```

### **Database Schema**

**Core Tables**:
1. `grievances` - All citizen grievances with AI scores
2. `commitments` - Public commitments and promises
3. `commitment_grievance_links` - M2M relationship table
4. `media_issues` - News/media reports
5. `audit_logs` - User action tracking

**Grievances Table Structure**:
```sql
id (TEXT, PRIMARY KEY)
uuid (UUID, UNIQUE)
title, description, category, issue_type
region, status
complaints_count, sentiment_severity, days_pending
public_visibility, escalation_risk
priority_score (REAL), priority_label (TEXT), ai_reasoning (TEXT)
source (TEXT: 'portal' | 'live-portal')
ingested_at, updated_at, created_at (TIMESTAMPS)
created_by_user_id, last_modified_by_user_id (TEXT)
is_deleted (BOOLEAN)

INDEXES: region, status, priority_score, source, is_deleted
```

### **Implementation Requirements**

#### **Database Connection**

**File**: `backend/db/connection.js`

Requirements:
1. Use `pg` library (npm package)
2. Read `DATABASE_URL` from environment
3. Create connection pool with 20 max connections
4. Handle SSL for production (Render external connections)
5. 30-second idle timeout
6. Log connection success/failure
7. Export connection object for all services

#### **Database Services Layer**

**File**: `backend/db/services.js`

Requirements:
1. **GrievanceService** class with methods:
   - `createGrievance(data)` - insert new, return created object
   - `getAllGrievances(filters)` - supports region, status, sortBy filters
   - `getGrievanceById(id)` - fetch single
   - `updateGrievance(id, updates)` - update fields
   - `getCriticalGrievances()` - priority_label = 'Critical'
   - `getGrievancesByRegion(region)` - filter by region
   - `deleteGrievance(id)` - soft delete (set is_deleted = true)

2. **CommitmentService** class with methods:
   - `createCommitment(data)`
   - `getAllCommitments(filters)`
   - `getCommitmentById(id)`
   - `getLinkedGrievances(commitmentId)` - fetch related grievances

3. **AuditLogService** class with methods:
   - `logAction(userId, action, resourceType, resourceId, ipAddress)`
   - `getAuditLogs(filters, limit)` - supports userId, action filters

All methods must be **async** (return promises).

#### **Database Initialization Script**

**File**: `backend/scripts/initDatabase.js`

Requirements:
1. Creates all tables with proper schema
2. Creates indexes for fast queries
3. Migrates data from JSON files to database
4. Handles conflicts gracefully (doesn't crash if tables exist)
5. Logs progress: "✅ Grievances table created", etc.
6. Seeds initial data from `/data/grievances.json` and `/data/commitments.json`
7. Can be run multiple times safely
8. Executable: `node scripts/initDatabase.js`

---

## **DATA MIGRATION STRATEGY**

### **One-Time Migration**

**Current**: grievances.json, commitments.json in memory  
**Future**: PostgreSQL persistent storage

**Steps**:
1. Initialize database schema
2. Seed existing JSON data into PostgreSQL
3. Update all routes to query database instead of JSON
4. Keep JSON files as backup (optional)

### **Data Consistency**

All grievances created after database is live:
- Insert directly into PostgreSQL
- Return from database in API responses
- Never write to JSON files again

---

## **SERVER MODIFICATIONS**

### **backend/server.js Changes**

Requirements:
1. Import `dbConnection` from `./db/connection`
2. Call `dbConnection.initialize()` on startup (async)
3. Handle database connection failures gracefully
4. Add route: `app.use('/api/live-stream', liveStreamRouter)`
5. Add graceful shutdown handler:
   - Close database connections
   - Stop live stream
   - Exit cleanly
6. Modify `/health` endpoint to report database status

### **backend/routes/issues.js Changes**

Requirements:
1. Import `GrievanceService` from `../db/services`
2. Change `GET /api/issues` from `loadJSON()` to `grievanceService.getAllGrievances()`
3. Make route handler **async**
4. Handle errors gracefully (500 with message)
5. Keep existing zone filtering logic
6. Keep existing scoring engine integration

---

## **ENVIRONMENT VARIABLES**

### **Development (.env.local)**
```
DATABASE_URL=postgresql://localhost:5432/governance_dev
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
```

### **Production (Render Dashboard)**
```
DATABASE_URL=postgresql://user:password@dpg-xxxxx.internal:5432/governance_db
NODE_ENV=production
```

**User Instruction**: Never commit `.env` to Git. Set variables in Render dashboard.

---

## **PACKAGE DEPENDENCIES**

**New packages to install**:
```bash
npm install pg
```

**Already installed** (don't update):
- express
- dotenv
- uuid
- bcryptjs
- cors

---

## **ERROR HANDLING & ROBUSTNESS**

### **Database Connection Errors**
- Log clearly: "❌ Database connection failed: [error]"
- Server continues (don't crash)
- Report in `/health` endpoint
- Retry connection on next request

### **SSE Connection Errors**
- Browser auto-reconnects (EventSource handles this)
- Server cleanup on disconnect (prevent memory leaks)
- No error thrown to user (silent reconnect)

### **Live Generation Errors**
- If grievance generation fails, log but continue
- If database insert fails, log but continue emitting
- Never stop the stream due to 1 failure

### **Zone Filtering**
- Admin sees all regions
- Officer sees only their constituency
- Validate in route handler (403 if unauthorized)

---

## **TESTING REQUIREMENTS**

### **Manual Testing (No Unit Tests Required)**

1. **Database Connection**
   ```bash
   # Should see: "✅ Database connected"
   npm start
   ```

2. **Live Stream Connection**
   ```bash
   # Browser should show new grievances arriving every 15-30 sec
   curl http://localhost:4000/api/live-stream
   ```

3. **API Queries**
   ```bash
   curl -H "x-user-id: user-admin-1" \
     http://localhost:4000/api/issues
   # Should return grievances from database
   ```

4. **Dashboard Update**
   - Open frontend
   - Watch grievances arrive in real-time
   - Counter increments
   - Priority re-ranks automatically

### **No Breaking Changes**
- Existing routes must still work
- Authentication still works
- Scoring engine still works
- Frontend still displays correctly

---

## **DEPLOYMENT TO PRODUCTION**

### **Step 1: Create PostgreSQL on Render** (5 min)
User Instructions:
1. Go to https://render.com/dashboard
2. Click "New +" → "PostgreSQL"
3. Name: `governance-db`
4. Click "Create Database"
5. Copy connection string (wait for it to be ready)

### **Step 2: Set Environment Variable on Render** (2 min)
User Instructions:
1. Select your backend service
2. Go to "Settings" → "Environment"
3. Add: `DATABASE_URL` = [paste connection string]
4. Click "Save"

### **Step 3: Deploy Code** (3 min)
User Instructions:
1. `git add .`
2. `git commit -m "Add live ingestion pipeline and PostgreSQL integration"`
3. `git push origin main`
4. Wait for Render to auto-deploy (2-3 min)

### **Step 4: Initialize Database** (3 min)
User Instructions:
1. Once backend is deployed, run:
   ```bash
   DATABASE_URL="[your_render_db_url]" node backend/scripts/initDatabase.js
   ```
2. Should see: "✅ Database initialization complete!"

### **Step 5: Verify** (1 min)
User Instructions:
1. Visit: `https://your-backend.onrender.com/health`
2. Should see `"database": "connected"`
3. Open your frontend
4. Watch grievances arrive in real-time!

---

## **PERFORMANCE TARGETS**

| Metric | Target | Why |
|--------|--------|-----|
| SSE Message Latency | < 100ms | Real-time feel |
| Database Query Time | < 50ms | Fast API responses |
| Live Grievance Generation | 15-30 sec interval | Visible but not spammy |
| Buffer Size | Max 5000 items | Bounded memory usage |
| Concurrent Connections | 20+ | Room for judge demo |

---

## **COMMON PITFALLS TO AVOID**

### **❌ DO NOT**
1. Hardcode database credentials in code
2. Use SQLite (ephemeral on Vercel/Render)
3. Make synchronous database calls (use async/await)
4. Forget to close database connections on shutdown
5. Emit massive SSE messages (keep under 1KB)
6. Generate grievances without randomization (judges see pattern)
7. Keep infinite buffer (causes memory leak)
8. Forget error handling (crashes lose hackathon points)

### **✅ DO**
1. Use environment variables for credentials
2. Write async service methods
3. Close connections gracefully
4. Validate user zones before sending data
5. Add indexes for fast queries
6. Log important events clearly
7. Test locally before deploying

---

## **CODE QUALITY STANDARDS**

1. **Naming**: Descriptive, camelCase for functions, UPPERCASE for constants
2. **Comments**: Explain *why*, not *what* (code shows what)
3. **Error Messages**: Clear and actionable
4. **Async/Await**: Use instead of .then() chains
5. **No Global State**: Use classes/services for stateful logic
6. **SQL Injection Prevention**: Always use parameterized queries (`$1`, `$2`, etc.)

---

## **EXPECTED FINAL STATE (Hackathon-Ready)**

### **What Judges Will See**
1. ✅ New grievances appearing in real-time on dashboard
2. ✅ Counter incrementing (e.g., "2,847 issues → 2,848 issues")
3. ✅ Priority re-ranking as new issues come in
4. ✅ Clean, professional UI with animations
5. ✅ Backend queries PostgreSQL (not JSON files)
6. ✅ `/health` shows database connected
7. ✅ No errors in console (logs are clean)

### **What I Will Say** (Your Pitch)
> "Our system uses Server-Sent Events for real-time grievance streaming. Every 15-30 seconds, a new citizen complaint enters our scoring engine, gets inserted into PostgreSQL, and is instantly streamed to all officers. The priority is auto-recalculated, risks are assessed, and the dashboard updates live. For governance systems processing thousands of daily complaints, real-time streaming is critical."

**Judges' Impression**: "This team understands production systems." 🏆

---

## **INSTRUCTION FOR YOU (User)**

### **Before Starting**
1. ✅ Backup current code (git commit everything)
2. ✅ Create PostgreSQL on Render (follow Step 1 above)
3. ✅ Install `pg` package: `npm install pg`
4. ✅ Have `.env` file ready with `DATABASE_URL`

### **Implementation Order**
1. Create `backend/db/connection.js` (database pool)
2. Create `backend/db/services.js` (query methods)
3. Create `backend/scripts/initDatabase.js` (schema + migration)
4. Create `backend/engine/liveIngestionEngine.js` (grievance generation)
5. Create `backend/routes/liveStream.js` (SSE endpoint)
6. Update `backend/server.js` (add database + routes)
7. Update `backend/routes/issues.js` (use services, not JSON)
8. Create `frontend/src/hooks/useLiveStream.ts` (SSE client)
9. Create `frontend/src/components/LiveFeedPanel.tsx` (UI)
10. Add CSS animations to `frontend/src/app/globals.css`
11. Add `<LiveFeedPanel />` to dashboard
12. Test locally
13. Deploy to Render

### **If You Get Stuck**
1. Check `DATABASE_URL` is set correctly
2. Verify PostgreSQL is provisioned on Render
3. Check syntax in query statements (use `$1`, `$2` for params)
4. Look at error logs in Render dashboard
5. Run `node scripts/initDatabase.js` again if tables missing

### **Timeline**
- **Backend Setup**: 20 minutes
- **Frontend Integration**: 10 minutes
- **Testing**: 10 minutes
- **Deployment**: 5 minutes
- **Total**: ~45 minutes

---

## **FINAL DELIVERABLE CHECKLIST**

- [ ] PostgreSQL database created on Render
- [ ] All backend files created (connection, services, routes)
- [ ] Database initialized with schema and seed data
- [ ] `server.js` updated with database initialization
- [ ] `issues.js` route uses database queries
- [ ] Live ingestion engine running (grievances every 15-30 sec)
- [ ] SSE endpoint (`/api/live-stream`) working
- [ ] Frontend hook (`useLiveStream`) receives updates
- [ ] Live feed component displays grievances in real-time
- [ ] Animations working smoothly
- [ ] Dashboard shows live counter incrementing
- [ ] Zone filtering works (officers see only their region)
- [ ] No errors in console/logs
- [ ] Deployed to Render (backend) + Vercel (frontend)
- [ ] Judges can see live demo working

---

## **SUCCESS CRITERIA FOR HACKATHON**

✅ **"Wow, new grievances are appearing in real-time!"**  
✅ **"The AI is continuously re-ranking priorities!"**  
✅ **"This is production-ready architecture!"**  
✅ **"How are you handling thousands of concurrent complaints?"**  

Your answer: "With PostgreSQL and SSE streaming. The system scales."

**Result**: 🏆 Competitive score with real judges

---

**This prompt is self-contained, error-proof, and production-quality.**  
**Follow it exactly, and you will have a hackathon-winning feature.**
