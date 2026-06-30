# Attachment Logbook System
### Strathmore University — ICS 3, Group E

A Progressive Web Application (PWA) that replaces the manual, paper-based student attachment logbook with a centralized digital platform — enabling real-time monitoring, digital approvals, and compliance reporting.

---

## The Problem

Strathmore students on mandatory WBL (320 hrs) and SBL (225 hrs) placements currently track daily activities in physical logbooks. These are vulnerable to loss and damage, invisible to university coordinators in real time, and require physical supervisor signatures each week — creating unnecessary delays and administrative overhead for all parties.

## The Solution

A web-based system with four role-specific portals:

| Role | Portal | Key Actions |
|------|--------|-------------|
| Student | Logging Module | Submit daily logs, track hours, view sync queue |
| Host Supervisor | Approval Portal | Review logs, approve/reject, finalize 20-credit score |
| Faculty Supervisor | Evaluation Portal | Grade mid-term assessments (30 credits), grade composite report (50 credits) |
| University Coordinator | Admin Dashboard | Manage institutions, users, monitor audit trail |

---

## Grading Model

| Component | Credits | Graded By | Source |
|-----------|---------|-----------|--------|
| Daily Logs (auto-averaged, overridable) | 20 | Host Supervisor | `logbook_entries.marks` |
| Mid-term/Final Assessment | 30 | Faculty Supervisor | `assessment_forms.faculty_marks` |
| Composite Report (PDF, ~30 pages) | 50 | Faculty Supervisor | `composite_reports.marks` |
| **Total** | **100** | — | Computed |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite (PWA) |
| Offline Support | Service Workers + IndexedDB (Workbox) — planned |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 18 |
| Auth | JWT + Role-Based Access Control (RBAC) |
| IDE | VS Code |
| Version Control | Git + GitHub |

---

## Project Structure

```
attachment-logbook-system/
├── client/                       ← React + TypeScript PWA frontend
│   └── src/
│       ├── api/
│       │   └── axios.ts          ← Axios instance with JWT interceptor
│       ├── components/
│       │   ├── AdminLayout.tsx
│       │   ├── StudentLayout.tsx
│       │   └── SupervisorLayout.tsx
│       ├── context/
│       │   └── AuthContext.tsx   ← Global auth state
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── StudentDashboard.tsx
│       │   ├── StudentLogs.tsx
│       │   ├── StudentSyncQueue.tsx
│       │   ├── SupervisorDashboard.tsx
│       │   ├── HostStudentList.tsx
│       │   ├── FacultyDashboard.tsx
│       │   ├── AdminDashboard.tsx
│       │   ├── AdminInstitutions.tsx
│       │   ├── AdminUsers.tsx
│       │   └── AdminAuditTrails.tsx
│       ├── App.tsx               ← Routing
│       └── main.tsx
├── server/                       ← Node.js + Express API
│   ├── config/
│   │   └── db.js                 ← PostgreSQL connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── logController.js
│   │   ├── assessmentController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   └── auth.js               ← JWT verification + admin check
│   ├── routes/
│   │   ├── auth.js
│   │   ├── logs.js
│   │   ├── assessments.js
│   │   └── admin.js
│   ├── index.js
│   └── .env                      ← never commit this
├── database/
│   └── schema.sql                ← all tables
├── docs/                         ← diagrams and documentation
└── README.md
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register a new user | None |
| POST | `/api/auth/login` | Login with email or student reg number | None |
| GET | `/api/auth/me` | Get current user info | JWT |

### Logbook Entries
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/logs` | Create a log entry | JWT (student) |
| GET | `/api/logs` | View all own log entries | JWT (student) |
| PATCH | `/api/logs/:id/submit` | Submit a draft entry | JWT (student) |
| GET | `/api/logs/pending` | View logs awaiting approval | JWT (host supervisor) |
| PATCH | `/api/logs/:id/review` | Approve or reject a log entry | JWT (host supervisor) |
| GET | `/api/logs/my-students` | List host supervisor's assigned students | JWT (host supervisor) |
| GET | `/api/logs/host-score/:studentId` | Get auto-calculated 20-credit host score | JWT (host supervisor) |
| POST | `/api/logs/host-score/:studentId` | Override/finalize the host score | JWT (host supervisor) |

### Assessment Forms
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/assessments/students` | View assigned students | JWT (faculty supervisor) |
| POST | `/api/assessments` | Submit a mid-term/final assessment (0-30) | JWT (faculty supervisor) |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/overview` | Dashboard stats (hours, sync rate, etc.) | JWT (admin) |
| GET | `/api/admin/institutions` | List all institutions | JWT (admin) |
| POST | `/api/admin/institutions` | Register a new institution | JWT (admin) |
| POST | `/api/admin/users` | Onboard a new user (any role) | JWT (admin) |
| GET | `/api/admin/users` | List all users | JWT (admin) |
| GET | `/api/admin/audit-trails` | Recent system activity feed | JWT (admin) |

---

## Frontend Pages

| Route | Page | Role |
|-------|------|------|
| `/login` | Login (email or student reg number) | All |
| `/student` | Student Workspace — create, submit, and track daily logs | Student |
| `/student/logs` | Daily Logs — full log history | Student |
| `/student/sync-queue` | Sync Queue — entries pending submission/sync | Student |
| `/supervisor` | Log Approval Queue — review and grade submitted logs | Host Supervisor |
| `/supervisor/students` | Student List — view assigned students, finalize 20-credit host score | Host Supervisor |
| `/faculty` | Faculty Evaluation Portal — assess assigned students | Faculty Supervisor |
| `/admin` | Administrator Overview | Admin |
| `/admin/institutions` | Institutions — list + register new | Admin |
| `/admin/users` | Users — list + onboard new | Admin |
| `/admin/audit-trails` | Full audit trail history | Admin |

All dashboards are wired to live backend data — no mock data used.

---

## Getting Started

See [`docs/DEV_SETUP.md`](./docs/DEV_SETUP.md) for the full environment setup guide.

Quick start:

```bash
# Backend
cd server && npm run dev

# Frontend
cd client && npm run dev
```

Then visit `http://localhost:5173/login`.

---

## Environment Variables

Create a `.env` file inside `server/` (never commit this):

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=logbook_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=logbook_secret_key
PORT=3000
```

---

## Team

- **Ishmael Ayallo** — 138615
- **Patrick Mungai** — 191231
- **Supervisor:** Daniel Machanje
- **School:** SCES, Strathmore University

---

## Project Status

| Milestone | Status |
|-----------|--------|
| Project Proposal | Complete |
| Dev Environment Setup | Complete |
| System Diagrams (all 7) | Complete |
| Database Schema (10+ tables) | Complete |
| Backend — Auth (email + reg number login, all 4 roles) | Complete |
| Backend — Logbook Entries | Complete |
| Backend — Supervisor Approvals + Audit Trail | Complete |
| Backend — Faculty Assessment Forms (upsert-safe, 0-30) | Complete |
| Backend — Admin Dashboard Routes | Complete |
| Frontend — All 4 dashboards (Student, Host, Faculty, Admin) | Complete |
| Multi-page navigation — Admin (4 pages) | Complete |
| Multi-page navigation — Student (3 pages) | Complete |
| Multi-page navigation — Host Supervisor (2 pages) | Complete |
| Post-presentation fixes (reg number login, real names, assessment upsert) | Complete |
| Weighted Grading System (Host 20 + Faculty 30 + Report 50 = 100) | In Progress |
| — Host Supervisor auto-avg score (0-20, overridable) | Complete |
| — Faculty Assessment score (0-30) | Complete |
| — Composite Report upload + grading (0-50) | Upcoming |
| — Final Grade Breakdown Report | Upcoming |
| Faculty — My Students / Log Archives / Academic Reports pages | Upcoming |
| Offline-First (Service Workers + IndexedDB) | Upcoming |
| Testing & Evaluation | Upcoming |
