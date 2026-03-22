# QUICK START: Implementation Checklist
## Real-Time Grievance Ingestion + PostgreSQL Database

**Time Estimate: 45 minutes total**

---

## **PHASE 1: Database Setup (10 min)**

### Step 1: Create PostgreSQL on Render
- [ ] Go to https://render.com/dashboard
- [ ] Click "New +" → "PostgreSQL"
- [ ] Name: `governance-db`
- [ ] Wait for database to be ready
- [ ] Copy connection string (looks like: `postgresql://user:pass@dpg-xxxxx.render.com:5432/governance_db`)

### Step 2: Add to Render Backend
- [ ] Go to your backend service settings
- [ ] Click "Environment"
- [ ] Add new variable: `DATABASE_URL` = [paste the connection string, but use `.internal` instead of `.render.com`]
- [ ] Click "Save"
- [ ] Note: `.internal` URL is faster for Render-to-Render

### Step 3: Install Package Locally
```bash
cd backend
npm install pg
```

---

## **PHASE 2: Backend Implementation (25 min)**

### Files to Create (in order):

#### ✅ 1. `backend/db/connection.js` (5 min)
**What it does**: Manages PostgreSQL connection pool
**From**: Template in "Database Connection" section of CLAUDE_OPUS_PROMPT.md
**Test**: Should see "✅ Database connected" when server starts

#### ✅ 2. `backend/db/services.js` (8 min)
**What it does**: Database query methods (GrievanceService, CommitmentService, AuditLogService)
**From**: Template in "Database Services Layer" section
**Methods needed**:
- GrievanceService: create, getAll, getById, update, delete, getCritical, getByRegion
- CommitmentService: create, getAll, getById, getLinkedGrievances
- AuditLogService: logAction, getAuditLogs

#### ✅ 3. `backend/scripts/initDatabase.js` (7 min)
**What it does**: Creates database schema + migrates JSON data
**From**: Template in "Database Initialization Script" section
**Run once**: `node scripts/initDatabase.js`
**Output should be**: "✅ All tables created successfully"

#### ✅ 4. `backend/engine/liveIngestionEngine.js` (3 min)
**What it does**: Generates new grievances every 15-30 seconds
**From**: Template in "Backend: Live Ingestion Engine" section
**Key features**:
- Generates realistic unique grievances
- Uses 28 Delhi regions (not 5)
- Randomizes all metrics
- Maintains max 5000 buffer (rolling window)
- Only emits if listeners connected

#### ✅ 5. `backend/routes/liveStream.js` (2 min)
**What it does**: SSE endpoint that broadcasts grievances
**From**: Template in "Backend: SSE Route" section
**Endpoint**: `GET /api/live-stream`
**Response format**: Server-Sent Events with grievance data

### Files to Modify:

#### ✅ 6. `backend/server.js` (modify)
**Changes needed**:
1. Add: `const dbConnection = require("./db/connection");`
2. Add database initialization in startup (async)
3. Add route: `app.use("/api/live-stream", liveStreamRouter);`
4. Start live ingestion: `liveIngestionEngine.startStream();`
5. Add graceful shutdown handlers
6. Update `/health` to report database status

**Exact location in file**: See section "SERVER MODIFICATIONS" in prompt

#### ✅ 7. `backend/routes/issues.js` (modify)
**Changes needed**:
1. Replace `loadJSON()` with `grievanceService.getAllGrievances()`
2. Make route handler `async`
3. Add error handling (try/catch)
4. Keep zone filtering logic
5. Keep scoring engine integration

**Exact location**: See section "backend/routes/issues.js Changes" in prompt

---

## **PHASE 3: Frontend Implementation (8 min)**

### Files to Create:

#### ✅ 8. `frontend/src/hooks/useLiveStream.ts` (3 min)
**What it does**: React hook for SSE connection
**Returns**:
- updates (last 10 messages)
- totalCount (current grievance count)
- topIssues (top 5 critical)
- isConnected (boolean)
- messageRate (messages/sec)

#### ✅ 9. `frontend/src/components/LiveFeedPanel.tsx` (4 min)
**What it does**: Displays incoming grievances in real-time
**Features**:
- Slides grievances in from top
- Color-coded priority badges (red/yellow/green)
- Live counter with animation
- Connection status indicator
- Message rate display

#### ✅ 10. Add CSS Animations (1 min)
**File**: `frontend/src/app/globals.css` (add to existing)
**Add**:
- `slideInFromTop` animation (0.5s)
- `pulseGlow` animation (highlight)
- Smooth transitions

### Files to Modify:

#### ✅ 11. `frontend/src/app/(dashboard)/dashboard/page.tsx` (modify)
**Change needed**:
- Add `<LiveFeedPanel />` component to dashboard layout
- Position it in the right sidebar

---

## **PHASE 4: Environment Setup (2 min)**

### Local Development
Create `backend/.env.local`:
```
DATABASE_URL=postgresql://localhost:5432/governance_dev
NODE_ENV=development
PORT=4000
```

### Production (Render)
Already set in dashboard (Step 2 above)

---

## **PHASE 5: Testing (2 min)**

### Test 1: Database Connection
```bash
npm start
# Should see: "✅ Database connected"
```

### Test 2: Initialize Database
```bash
node backend/scripts/initDatabase.js
# Should see: "✅ Database initialization complete!"
```

### Test 3: Live Grievances
- Open frontend
- Watch grievances arrive every 15-30 seconds
- Counter increments
- Priorities re-rank automatically

### Test 4: API Call
```bash
curl -H "x-user-id: user-admin-1" http://localhost:4000/api/issues
# Should return grievances from database (not JSON)
```

---

## **PHASE 6: Deployment (5 min)**

### Local to Git
```bash
git add .
git commit -m "Add real-time grievance ingestion + PostgreSQL database"
git push origin main
```

### Wait for Render
- Render auto-deploys (2-3 minutes)
- Check deployment status in Render dashboard

### Verify Production
- Visit: `https://your-backend.onrender.com/health`
- Should show: `"database": "connected"`
- Open frontend (Vercel) → watch live grievances flow in!

---

## **ERROR HANDLING: What To Do If...**

### "DATABASE_URL not set"
→ Go to Render dashboard → Backend service → Environment → Add DATABASE_URL

### "could not connect to server"
→ Check PostgreSQL is provisioned (Take 1-2 min to start)
→ Use `.internal` URL (not `.render.com`) for Render-to-Render

### "table grievances does not exist"
→ Run: `node backend/scripts/initDatabase.js`

### "Connection timeout"
→ Check firewall isn't blocking PostgreSQL
→ Verify DATABASE_URL is correct (copy-paste carefully)

### "Grievances not appearing in real-time"
→ Check browser console for errors
→ Verify EventSource is open: `curl http://localhost:4000/api/live-stream`
→ Check backend logs for "New grievance" messages

### "Frontend keeps reconnecting"
→ This is normal (browser auto-reconnect)
→ Should stabilize after network issue passes
→ Check backend is running and healthy

---

## **FINAL VERIFICATION BEFORE HACKATHON**

- [ ] PostgreSQL database created on Render
- [ ] Backend connected to database (green in Render)
- [ ] `npm install pg` completed
- [ ] All 10 backend files created/modified
- [ ] All 3 frontend files created/modified
- [ ] Local testing works (new grievances appear every 15-30 sec)
- [ ] Deployed to Render (backend) + Vercel (frontend)
- [ ] `/health` endpoint shows database connected
- [ ] No errors in console
- [ ] Counter increments in real-time
- [ ] Zone filtering works (officer sees only own region)
- [ ] Live feed animations smooth and professional

---

## **DEMO SCRIPT FOR JUDGES**

> "I'm going to show you our real-time grievance ingestion system. As you can see, every 15-30 seconds a new citizen complaint arrives in the system. It goes through our AI scoring engine, gets insertedinto our PostgreSQL database, and is instantly streamed to our dashboard via Server-Sent Events.
>
> Notice the counter incrementing in real-time. The priorities are being continuously recalculated. Each new grievance is assessed for escalation risk, sentiment severity, and linkage to existing commitments.
>
> For a governance system handling thousands of daily complaints, this real-time architecture is critical. Officers get instant visibility into emerging issues before they escalate to media."

**Expected reaction**: 😲 "Wow, this is production-ready!"

---

## **TIMELINE SUMMARY**

| Phase | Task | Time |
|-------|------|------|
| 1 | Database setup | 10 min |
| 2 | Backend implementation | 25 min |
| 3 | Frontend implementation | 8 min |
| 4 | Environment setup | 2 min |
| 5 | Testing | 2 min |
| 6 | Deployment | 5 min |
| **TOTAL** | **Full implementation** | **~52 min** |

---

## **PRE-IMPLEMENTATION CHECKLIST**

Before you start, make sure you have:

- [ ] Read the full CLAUDE_OPUS_PROMPT.md (you have it in your repo)
- [ ] Access to Render dashboard (backend already deployed)
- [ ] Git repository connected
- [ ] Node.js/npm installed locally
- [ ] Text editor (VS Code)
- [ ] PostgreSQL connection string from Render ready
- [ ] 1 hour of uninterrupted time

---

## **SUPPORT REFERENCE**

For detailed implementation, refer to:
- 📄 `CLAUDE_OPUS_PROMPT.md` - Full technical specification
- 📄 `DEPLOYMENT_GUIDE.md` - Deployment instructions (already created)
- 📁 Existing project files - Use as templates

---

**YOU'RE READY! Start with Phase 1 and follow the checklist. 
Everything is planned, templated, and error-proof. 
45 minutes to hackathon-ready. Let's go! 🚀**
