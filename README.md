# Attachment Logbook System (LogSync)
### Strathmore University — ICS 3, Group E

A Progressive Web Application (PWA) that replaces the manual, paper-based student attachment logbook with a centralized digital platform — enabling real-time monitoring, digital approvals, and compliance reporting.

---

## The Problem

Strathmore students on mandatory WBL (320 hrs) and SBL (225 hrs) placements currently track daily activities in physical logbooks. These are vulnerable to loss and damage, invisible to university coordinators in real time, and require physical supervisor signatures each week — creating unnecessary delays and administrative overhead for all parties.

## The Solution

A web-based system with four role-specific portals:

| Role | Portal | Key Actions |
|------|--------|-------------|
| Student | Logging Module | Submit daily logs, upload composite report, view final grade |
| Host Supervisor | Approval Portal | Review logs, approve/reject, finalize 20-credit score |
| Faculty Supervisor | Evaluation Portal | Grade mid-term assessments (30 credits), grade composite report (50 credits) |
| University Coordinator | Admin Dashboard | Manage institutions, users, monitor audit trail |

---

## Grading Model

| Component | Credits | Graded By | Source |
|-----------|---------|-----------|--------|
| Daily Logs (auto-averaged, overridable) | 20 | Host Supervisor | `logbook_entries.marks` |
| Mid-term/Final Assessment | 30 | Faculty Supervisor | `assessment_forms.faculty_marks` |
| Composite Report (PDF) | 50 | Faculty Supervisor | `composite_reports.marks` |
| **Total** | **100** | — | Computed |

Grade boundaries: A (70+, Distinction), B (60+, Merit), C (50+, Pass), F (below 50, Fail)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite (PWA) |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 18 |
| Auth | JWT + Role-Based Access Control (RBAC) |
| File Upload | Multer (PDF, local disk — see Limitations) |
| IDE | VS Code |
| Version Control | Git + GitHub |

---

## Known Limitations

- **File Storage:** Composite report PDFs are stored on local disk (`server/uploads/`). This works for development and demo purposes but is not suitable for production deployment. A cloud storage solution (e.g. AWS S3) should be used in a production environment.

---

## Project Structure

```
attachment-logbook-system/
├── client/
│   └── src/
│       ├── api/
│       │   └── axios.ts
│       ├── components/
│       │   ├── AdminLayout.tsx
│       │   ├── StudentLayout.tsx
│       │   ├── SupervisorLayout.tsx
│       │   └── FacultyLayout.tsx
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── StudentDashboard.tsx
│       │   ├── StudentLogs.tsx
│       │   ├── StudentReport.tsx
│       │   ├── StudentGrade.tsx
│       │   ├── SupervisorDashboard.tsx
│       │   ├── HostStudentList.tsx
│       │   ├── FacultyDashboard.tsx
│       │   ├── FacultyReports.tsx
│       │   ├── AdminDashboard.tsx
│       │   ├── AdminInstitutions.tsx
│       │   ├── AdminUsers.tsx
│       │   └── AdminAuditTrails.tsx
│       ├── context/
│       │   └── AuthContext.tsx
│       ├── App.tsx
│       └── main.tsx
├── server/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── logController.js
│   │   ├── assessmentController.js
│   │   ├── reportController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── logs.js
│   │   ├── assessments.js
│   │   ├── reports.js
│   │   └── admin.js
│   ├── uploads/              (gitignored)
│   ├── index.js
│   └── .env                  (never commit)
├── database/
│   └── schema.sql
├── docs/
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
| GET | `/api/logs/my-grade` | Get final grade breakdown | JWT (student) |
| GET | `/api/logs/pending` | View logs awaiting approval | JWT (host supervisor) |
| PATCH | `/api/logs/:id/review` | Approve or reject a log entry | JWT (host supervisor) |
| GET | `/api/logs/my-students` | List assigned students | JWT (host supervisor) |
| GET | `/api/logs/host-score/:studentId` | Get auto-calculated 20-credit host score | JWT (host supervisor) |
| POST | `/api/logs/host-score/:studentId` | Override/finalize the host score | JWT (host supervisor) |

### Assessment Forms
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/assessments/students` | View assigned students | JWT (faculty supervisor) |
| POST | `/api/assessments` | Submit a mid-term/final assessment (0-30) | JWT (faculty supervisor) |

### Composite Reports
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/reports/upload` | Upload composite report PDF | JWT (student) |
| GET | `/api/reports/my-report` | View own report status | JWT (student) |
| GET | `/api/reports/pending` | View reports awaiting grading | JWT (faculty supervisor) |
| PATCH | `/api/reports/:id/grade` | Grade a composite report (0-50) | JWT (faculty supervisor) |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/overview` | Dashboard stats | JWT (admin) |
| GET | `/api/admin/institutions` | List all institutions | JWT (admin) |
| POST | `/api/admin/institutions` | Register a new institution | JWT (admin) |
| GET | `/api/admin/users` | List all users | JWT (admin) |
| POST | `/api/admin/users` | Onboard a new user | JWT (admin) |
| GET | `/api/admin/audit-trails` | System activity feed | JWT (admin) |
| GET | `/api/admin/final-grade/:studentId` | Get student final grade breakdown | JWT (admin) |

---

## Frontend Pages

| Route | Page | Role |
|-------|------|------|
| `/login` | Login (email or student reg number) | All |
| `/student` | Student Workspace — create and submit daily logs | Student |
| `/student/logs` | Daily Logs — full log history with feedback and marks | Student |
| `/student/report` | Composite Report — upload PDF, view grading status | Student |
| `/student/grade` | Final Grade — full breakdown with progress bars | Student |
| `/supervisor` | Log Approval Queue — review and grade submitted logs | Host Supervisor |
| `/supervisor/students` | Student List — finalize 20-credit host score | Host Supervisor |
| `/faculty` | Faculty Evaluation Portal — mid-term assessments (0-30) | Faculty Supervisor |
| `/faculty/reports` | Composite Reports — grade student PDFs (0-50) | Faculty Supervisor |
| `/admin` | Administrator Overview — system stats | Admin |
| `/admin/institutions` | Institutions — list and register | Admin |
| `/admin/users` | Users — list and onboard | Admin |
| `/admin/audit-trails` | Audit Trail — full system history | Admin |

---

## Getting Started

```bash
# Backend
cd server && npm run dev

# Frontend
cd client && npm run dev
```

Visit `http://localhost:5173/login`

### Test Accounts
| Role | Login | Password |
|------|-------|----------|
| Student | `138615` or `ishmael@strathmore.edu` | `password123` |
| Host Supervisor | `supervisor@company.com` | `password123` |
| Faculty Supervisor | `faculty@strathmore.edu` | `password123` |
| Admin | `admin@strathmore.edu` | `password123` |

---

## Environment Variables

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
| Backend — Auth (email + reg number, all 4 roles) | Complete |
| Backend — Logbook Entries + Supervisor Approvals | Complete |
| Backend — Faculty Assessment Forms | Complete |
| Backend — Composite Report Upload + Grading | Complete |
| Backend — Admin Dashboard Routes | Complete |
| Backend — Final Grade Breakdown (all 3 components) | Complete |
| Frontend — All 4 roles, all pages wired to live data | Complete |
| Weighted Grading System (20 + 30 + 50 = 100) | Complete |
| Post-presentation fixes (reg number login, real names) | Complete |
| Testing and Evaluation | Upcoming |
