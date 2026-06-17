# Attachment Logbook System
### Strathmore University — ICS 3, Group E

A Progressive Web Application (PWA) that replaces the manual, paper-based student attachment logbook with a centralized digital platform — enabling real-time monitoring, digital approvals, and compliance reporting.

---

## The Problem

Strathmore students on mandatory WBL (320 hrs) and SBL (225 hrs) placements currently track daily activities in physical logbooks. These are vulnerable to loss and damage, invisible to university coordinators in real time, and require physical supervisor signatures each week — creating unnecessary delays and administrative overhead for all parties.

## The Solution

A web-based system with three role-specific portals:

| Role | Portal | Key Actions |
|------|--------|-------------|
| Student | Logging Module | Submit daily logs, track hours, works offline |
| Host / Faculty Supervisor | Approval Portal | Review logs, approve/reject, add feedback |
| University Coordinator | Admin Dashboard | Monitor cohort progress, export PDF reports |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite (PWA) |
| Offline Support | Service Workers + IndexedDB (Workbox) |
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
│       ├── context/
│       │   └── AuthContext.tsx   ← Global auth state
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── StudentDashboard.tsx
│       │   └── SupervisorDashboard.tsx
│       ├── App.tsx               ← Routing
│       └── main.tsx
├── server/                       ← Node.js + Express API
│   ├── config/
│   │   └── db.js                 ← PostgreSQL connection
│   ├── controllers/
│   │   ├── authController.js
│   │   └── logController.js
│   ├── middleware/
│   │   └── auth.js               ← JWT verification
│   ├── routes/
│   │   ├── auth.js
│   │   └── logs.js
│   ├── index.js
│   └── .env                      ← never commit this
├── database/
│   └── schema.sql                ← all 10 tables
├── docs/                         ← diagrams and documentation
└── README.md
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register a new user | None |
| POST | `/api/auth/login` | Login and receive JWT | None |
| GET | `/api/auth/me` | Get current user info | JWT |

### Logbook Entries
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/logs` | Create a log entry | JWT (student) |
| GET | `/api/logs` | View all own log entries | JWT (student) |
| PATCH | `/api/logs/:id/submit` | Submit a draft entry | JWT (student) |
| GET | `/api/logs/pending` | View logs awaiting approval | JWT (host supervisor) |
| PATCH | `/api/logs/:id/review` | Approve or reject a log entry | JWT (host supervisor) |

---

## Frontend Pages

| Route | Page | Role |
|-------|------|------|
| `/login` | Login | All |
| `/student` | Student Workspace — create, submit, and track daily logs | Student |
| `/supervisor` | Log Approval Queue — review and grade submitted logs | Host Supervisor |

Both dashboards are wired to live backend data — no mock data used.

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
| Project Proposal | ✅ Complete |
| Dev Environment Setup | ✅ Complete |
| System Diagrams (all 7) | ✅ Complete |
| Database Schema (10 tables) | ✅ Complete |
| Backend — Auth Module | ✅ Complete |
| Backend — Logbook Entry Module | ✅ Complete |
| Backend — Supervisor Approval Module + Audit Trail | ✅ Complete |
| Frontend — Login, Student & Supervisor Dashboards | ✅ Complete |
| Backend — Admin Dashboard Routes | ⬜ Upcoming |
| Frontend — Admin & Faculty Dashboards | ⬜ Upcoming |
| Offline-First (Service Workers + IndexedDB) | ⬜ Upcoming |
| Testing & Evaluation | ⬜ Upcoming |
