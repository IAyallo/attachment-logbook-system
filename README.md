<!-- markdownlint-disable MD022 MD024 MD032 MD034 -->

# Attachment Hub

Strathmore University industrial attachment platform for WBL and SBL supervision, grading, and reporting.

## Overview

This system replaces manual attachment logbooks with a role-based web application for:
- daily log capture and review
- host and faculty assessment
- composite report grading
- student-led attachment applications and approvals
- notifications and audit visibility

## Roles and Core Responsibilities

| Role | Main Capabilities |
| --- | --- |
| Student | Submit daily logs, apply for attachment, view approved institutions, track current and past attachments, upload report, view final grade and reviews |
| Host Supervisor | Review submitted logs, score host component, view assigned students |
| Faculty Supervisor | Submit faculty assessment, grade reports, view analytics |
| Admin | Manage institutions and users, review applications, assign faculty supervisors, monitor audit trails, reset user passwords |

## Grading Model

| Component | Weight |
| --- | --- |
| Host component | 20 |
| Faculty assessment | 30 |
| Composite report | 50 |
| Total | 100 |

## Key Features Delivered

### Attachment application workflow
- Student submits application with organisation and supervisor details.
- Admin reviews and approves or rejects applications.
- On approval, student attachment cycle updates and onboarding links are applied.

### Current and past attachment visibility
- Students can view current attachment details on dashboard.
- Students can view previous attachment records with detailed snapshots.

### Lifecycle controls
- Previous cycle data is isolated from active cycle views.
- Host/faculty/admin active log views are filtered to current attachment window.

### Password recovery and reset
- User can submit forgot-password request from login page.
- Admin receives notification and resets password from Users page.
- Reset user is forced to change password on next login.

### Notifications
- Role-scoped notifications for major workflow events.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express
- Database: PostgreSQL
- Auth: JWT
- File uploads: Multer

## Project Structure

```text
attachment-logbook-system/
├── client/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── pages/
│       ├── App.tsx
│       └── main.tsx
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── uploads/
│   └── index.js
├── database/
│   ├── schema.sql
│   └── test_bulk_upload.csv
├── docs/
│   ├── CHANGE_SUMMARY.md
│   ├── Past_Attachments_Migration_pgAdmin.sql
│   └── View_Past_Attachments_Flow.md
└── README.md
```

## Backend API Summary

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/forgot-password-request
- POST /api/auth/change-password
- GET /api/auth/me

### Logs
- POST /api/logs
- GET /api/logs
- PATCH /api/logs/:id/submit
- GET /api/logs/pending
- PATCH /api/logs/:id/review
- GET /api/logs/host-score/:studentId
- POST /api/logs/host-score/:studentId
- GET /api/logs/my-students
- GET /api/logs/my-grade

### Assessments
- GET /api/assessments/students
- POST /api/assessments

### Reports and analytics
- POST /api/reports/upload
- GET /api/reports/my-report
- GET /api/reports/pending
- PATCH /api/reports/:id/grade
- GET /api/reports/students
- GET /api/reports/weekly
- GET /api/reports/category-performance
- GET /api/reports/logs-by-category

### Applications
- GET /api/applications/institutions
- GET /api/applications/my
- GET /api/applications/current
- GET /api/applications/previous
- POST /api/applications
- GET /api/applications/admin
- PATCH /api/applications/admin/:id/review

### Notifications
- GET /api/notifications
- PATCH /api/notifications/read-all
- PATCH /api/notifications/:id/read

### Admin
- GET /api/admin/overview
- GET /api/admin/institutions
- POST /api/admin/institutions
- GET /api/admin/users
- POST /api/admin/users
- PATCH /api/admin/users/:userId/reset-password
- POST /api/admin/users/bulk-upload
- GET /api/admin/assignment-options
- GET /api/admin/assignments
- PATCH /api/admin/assignments/:studentId
- GET /api/admin/audit-trails
- GET /api/admin/final-grade/:studentId

## Frontend Routes

### Public
- /login

### Shared guarded
- /change-password

### Student
- /student
- /student/logs
- /student/apply
- /student/institutions
- /student/previous-attachments
- /student/report
- /student/grade
- /student/notifications

### Host Supervisor
- /supervisor
- /supervisor/students
- /supervisor/assess/:studentId
- /supervisor/reports
- /supervisor/notifications

### Faculty Supervisor
- /faculty
- /faculty/assess/:studentId
- /faculty/reports
- /faculty/analytics
- /faculty/notifications

### Admin
- /admin
- /admin/institutions
- /admin/users
- /admin/assignments
- /admin/applications
- /admin/reports
- /admin/audit-trails
- /admin/notifications

## Getting Started

### 1) Prerequisites
- Node.js 18+
- PostgreSQL

### 2) Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 3) Configure environment

Create server/.env:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=logbook_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=logbook_secret_key
PORT=3000
```

### 4) Database setup
- Run database/schema.sql on PostgreSQL.
- For incremental updates already in progress, apply:
  - docs/Past_Attachments_Migration_pgAdmin.sql

Important: if missing, apply this for forced password change flow:

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
```

### 5) Run application

```bash
# terminal 1
cd server
npm run dev

# terminal 2
cd client
npm run dev
```

Open: http://localhost:5173/login

## Notes

- Uploaded reports are served from server/uploads (local disk).
- Sync queue features are deferred from current release scope.
- Main change log is documented in docs/CHANGE_SUMMARY.md.

## Team

- Ishmael Ayallo (138615)
- Patrick Mungai (191231)
- Supervisor: Daniel Machanje
- School: SCES, Strathmore University
