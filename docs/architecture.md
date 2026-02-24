# AI Governance Priority & Accountability Engine
Domain: Digital Democracy
Category: Open Innovation

## 1. System Purpose
This system is a decision-support platform for public governance offices.
It prioritizes governance issues, tracks public commitments, and generates leadership-ready intelligence briefs.
It does NOT automate decisions and does NOT interact with citizens directly.

## 2. Primary Users
- Admin (IT / Senior Officer)
- Officer (Grievance & War-room Staff)
- Leader (Read-only: MLA / MP / Minister)

## 3. Core Functional Modules

### 3.1 Authentication & Authorization
- Role-based login (Admin, Officer, Leader)
- No public signups
- Session-based authentication
- Role-based route protection
- Lightweight audit logging for actions

### 3.2 Data Ingestion Layer (Mocked)
The system ingests structured governance data:
- Citizen grievances
- Public commitments / promises
- Media issues
- Internal reports

Data is mocked using JSON files but structured as real government systems.

### 3.3 Priority Scoring Engine (Core Intelligence)
Each issue is scored using explainable weighted logic:
- Complaint volume
- Sentiment severity
- Time pending
- Public visibility
- Escalation risk

Outputs:
- Priority score (0–100)
- Priority label (Critical, Attention, Stable)
- AI-generated explanation for score

### 3.4 Accountability & Commitment Tracker
Tracks:
- Promise title
- Announcement date
- Current status
- Days pending
- Linked grievances
- Risk level

Visual indicators highlight delayed commitments.

### 3.5 Leadership Intelligence Briefs
Generates:
- Top critical issues today
- Most delayed commitments
- High escalation risk items
- What changed since yesterday

Briefs are concise, neutral, and policy-oriented.

### 3.6 Ask the Governance Engine
Query-based intelligence interface:
- “What needs urgent attention today?”
- “Which commitments are overdue?”

This is not a chatbot.
It returns structured insights only.

## 4. Technology Stack

Frontend:
- Next.js (App Router)
- Tailwind CSS
- Component-based dashboard UI

Backend:
- Node.js + Express
- Modular service architecture

AI Layer:
- Explainable scoring logic
- AI used only for explanation and summarization

Data Layer:
- JSON mock data for MVP

Security:
- Role-based access
- Audit trail
- No real citizen data

## 5. Folder Structure (Required)

frontend/
- app/
  - login/
  - dashboard/
  - commitments/
  - briefs/
  - ask-engine/

backend/
- auth/
- routes/
- engine/
- data/
- utils/

## 6. Constraints
- No citizen-facing app
- No chatbot-first UX
- No external API dependency
- Must be demoable offline

## 7. Success Criteria
- Clear prioritization logic
- Visible accountability timelines
- Leader-ready insights
- Institutional credibility