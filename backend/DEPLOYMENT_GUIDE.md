
# Deployment Guide: PostgreSQL on Render + Node.js Backend

## Quick Setup (20 minutes)

### 1. Create PostgreSQL Database on Render

1. Go to **https://render.com/dashboard**
2. Click **New +** → **PostgreSQL**
3. Fill in:
   ```
   Name: governance-db
   Database: governance
   Region: (match your backend region)
   ```
4. Click **Create Database**
5. Copy the connection string when ready

   Example:
   ```
   postgresql://user:password@dpg-xxxxx.render.com:5432/governance_db
   ```

### 2. Update Render Backend Environment

1. In Render Dashboard → Select your Backend Service
2. Go to **Settings** → **Environment**
3. Add new environment variable:
   ```
   Name: DATABASE_URL
   Value: postgresql://user:password@dpg-xxxxx.internal:5432/governance_db
   
   (Use .internal URL - faster, stays on Render network)
   ```
4. Click **Save**

### 3. Install Dependencies Locally

```bash
cd backend
npm install pg
```

### 4. Create .env File Locally

```bash
# Copy the template
cp .env.example .env

# Edit with your database URL
# DATABASE_URL=postgresql://user:password@dpg-xxxxx.internal:5432/governance_db
```

### 5. Initialize Database (Run Once)

```bash
node scripts/initDatabase.js
```

Output should show:
```
✅ Database connected
✅ Grievances table created
✅ Commitments table created
✅ Database initialization complete!
```

### 6. Test Locally

```bash
npm run dev
# or
npm start
```

Visit: http://localhost:4000/health

Should return:
```json
{
  "status": "OK",
  "database": "connected",
  "service": "ai-governance-backend"
}
```

### 7. Deploy to Render

**Option A: Via Git (Recommended)**
- Push code to GitHub
- Render auto-deploys on push

**Option B: Via Render Dashboard**
- In your service, click **Manual Deploy** → **Deploy Latest**

---

## File Changes Summary

### New Files Created
- `backend/db/connection.js` - Database connection pool
- `backend/db/services.js` - Database query service classes
- `backend/scripts/initDatabase.js` - Migration script
- `backend/.env.example` - Environment template

### Modified Files
- `backend/server.js` - Added database initialization
- `backend/routes/issues.js` - Changed to use database queries
- `backend/package.json` - Add `pg` dependency

---

## Environment Variables

### Local Development (.env)
```
DATABASE_URL=postgresql://localhost:5432/governance_dev
NODE_ENV=development
PORT=4000
```

### Render Production (Set in Dashboard)
```
DATABASE_URL=postgresql://user:password@dpg-xxxxx.internal:5432/governance_db
NODE_ENV=production
PORT=4000
```

---

## Updating Other Routes

### Pattern to Follow

**Before (JSON):**
```javascript
const grievances = loadJSON("grievances.json");
res.json(grievances);
```

**After (Database):**
```javascript
const grievanceService = new GrievanceService();
const grievances = await grievanceService.getAllGrievances();
res.json(grievances);
```

Update these routes:
- `routes/commitments.js`
- `routes/briefs.js`
- `routes/audit.js`
- `routes/simulation.js`

---

## Troubleshooting

### "DATABASE_URL not set"
→ Set environment variable in Render dashboard

### "Could not connect to server"
→ Check PostgreSQL is provisioned in Render
→ Verify DATABASE_URL is correct
→ Check network connectivity

### "table grievances does not exist"
→ Run: `node scripts/initDatabase.js`

### "Connection timeout"
→ Use `.internal` URL for Render-to-Render
→ Use `.render.com` URL from external

---

## Backend is Now Database-Ready!

✅ PostgreSQL connected  
✅ Persistent data storage  
✅ Ready for hackathon judges  
✅ Scalable to thousands of records  

Your Vercel frontend will call your Render backend,  
which queries the Render PostgreSQL database.  
Perfect architecture for national hackathon! 🎯
