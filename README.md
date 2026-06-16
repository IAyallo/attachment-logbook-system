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
├── client/          ← React + TypeScript PWA frontend
├── server/          ← Node.js + Express API
├── database/        ← SQL schema and migration files
├── docs/            ← Diagrams, wireframes, documentation
└── README.md
```

---

## Getting Started

See [`docs/DEV_SETUP.md`](./docs/DEV_SETUP.md) for the full environment setup guide.

Quick start (once set up):

```bash
# Frontend
cd client && npm run dev

# Backend
cd server && npm run dev
```

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
| Requirements & System Design | 🔄 In Progress |
| Implementation — Sprint 1 | ⬜ Upcoming |
| Testing & Evaluation | ⬜ Upcoming |
