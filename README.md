# 🏥 MediCare — Hospital Management & Appointment Scheduling System

MediCare is a full-stack MERN application that digitizes the complete patient journey: online appointment booking, doctor schedules, live queues, electronic medical records, prescriptions, pharmacy inventory, payments, notifications, and management analytics.

## 🌐 Live Links

| Frontend | Backend API |
|----------|-------------|
| [medicare.vercel.app](https://medicare-eight-pearl.vercel.app) | [medicare-api.vercel.app](https://medicare-api-eight.vercel.app) |

> Demo credentials are listed below.

## ✨ Features

- **Online appointment booking** with conflict-free slot claiming (no double-booking under concurrent load)
- **Doctor schedules** — weekly templates, bulk generation, breaks, same-day cancel
- **Live queue system** — token numbers, emergency priority, status flow (WAITING → CALLED → IN_CONSULTATION → COMPLETED)
- **Electronic Medical Records (EMR)** — immutable edit history, finalized records locked
- **Prescriptions** — doctor writes, pharmacist dispenses, live stock deduction
- **Pharmacy inventory** — low stock & expiring alerts, IN/OUT stock management
- **Payments** — inline payment records tied to appointments
- **Notifications** — in-app alerts for bookings, cancellations, queue calls, stock
- **Reviews & ratings** — verified patients rate completed visits
- **Admin analytics** — revenue reports, top doctors, patient growth, CSV export, full audit log
- **Role-based access** — Admin, Doctor, Receptionist, Pharmacist, Patient

## 🛠️ Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts
- **Backend:** Node.js + Express (REST API under `/api/v1`)
- **Database:** MongoDB (Mongoose) — transactions on replica sets, atomic slot claims
- **Auth:** JWT access token (memory) + rotating httpOnly refresh cookie, role-based access control
- **Testing:** Jest + Supertest + mongodb-memory-server (18 integration tests)

## 🔑 Demo Accounts

Seeded by `server/src/seed.js` — used live on the deployed site:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hospital.test` | `admin12345` |
| Doctor | `doctor1@hospital.test` | `doctor12345` |
| Receptionist | `reception1@hospital.test` | `staff12345` |
| Pharmacist | `pharmacist1@hospital.test` | `staff12345` |
| Patient | `patient1@hospital.test` | `patient12345` |

## 📁 Project Structure

```
├── client/            # React single-page application
│   ├── src/pages/     # role-based pages (admin, doctor, patient, pharmacy, reception)
│   └── vercel.json    # static hosting + /api proxy to the live backend
├── server/            # Express REST API
│   ├── src/
│   │   ├── config/        # env, db, constants
│   │   ├── middlewares/   # auth, RBAC, error handler, rate limiting
│   │   ├── models/        # 15 Mongoose models
│   │   ├── modules/       # auth, users, patients, doctors, departments,
│   │   │                  # schedules, appointments, queues, medicalRecords,
│   │   │                  # prescriptions, medicines, payments, notifications,
│   │   │                  # reviews, admin
│   │   ├── services/      # audit + notification helpers
│   │   ├── utils/         # transactions, dates, tokens, pagination, validation
│   │   ├── app.js         # express app
│   │   └── seed.js        # demo data + credentials
│   └── tests/             # integration tests
├── docs/               # proposal markdown + generated PDF
└── tools/pdf/          # PDF generator for the proposal
```

## 🚀 Run Locally

### 1. Database

Start MongoDB locally (`mongod`) or use a MongoDB Atlas cluster. Multi-document transactions require a replica set (Atlas is a replica set by default).

### 2. Backend

```bash
cd server
npm install
copy .env.example .env      # set MONGODB_URI, JWT secrets, CLIENT_URL
npm run seed                # populate demo data (see credentials below)
npm run dev                 # API on http://localhost:5000
```

### 3. Frontend

```bash
cd client
npm install
npm run dev                 # UI on http://localhost:5173 (proxies /api to :5000)
```

### 4. Tests

```bash
cd server
npx jest --runInBand
```

### 5. Proposal PDF

```bash
cd tools/pdf
npm install
npm run generate            # writes docs/Hospital_Management_System_Proposal.pdf
```

## 🌍 Deployment Notes

Both apps are deployed to Vercel:

1. **API** (`server/`) runs as a single serverless function (`api/index.js`) that connects to MongoDB Atlas before handling requests. The GitHub repo's `server` directory is the project root.
2. **Frontend** (`client/`) is a static Vite build. Its `vercel.json` rewrites `/api/*` to the live backend, so the browser only ever talks to one origin — no cross-origin cookie headaches.
3. Refresh cookies use `SameSite=Lax` locally and `SameSite=None; Secure` on the deployed API via the `COOKIE_SAME_SITE` env var.

## 💡 Key Design Highlights

- **No double-booking:** `schedules.slots` is the single source of truth. Booking performs an atomic `$elemMatch` status transition, backed by a partial unique compound index `{scheduleId, slotTime}`; loser transactions are safely released. Verified by an 8-way concurrent booking stress test.
- **Transactions:** `runInTransaction` uses MongoDB sessions on replica sets and falls back gracefully on standalone instances.
- **Live queue:** sequential token numbers, emergency priority, and a `WAITING → CALLED → IN_CONSULTATION → COMPLETED` status flow.
- **Medico-legal records:** edit history is immutable; finalized records can't be modified.
- **Full audit trail:** every critical action is written to `auditLogs`.
- **Security:** JWT + rotating refresh cookies, Zod validation, mongo-sanitize, Helmet, rate limiting, env-based config (no secrets in the repo).

## 📡 API Overview

All responses use a uniform envelope: `{ success, message, data }`. Errors carry a machine-readable `errorCode`.

| Module | Example endpoints |
|--------|-------------------|
| Auth | `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `/me` |
| Appointments | `POST /api/v1/appointments`, `PATCH /:id/cancel|reschedule|check-in`, `GET /mine` |
| Schedules | `POST /api/v1/schedules`, `/bulk`, `GET /:doctorId/available?date=`, `PATCH /:doctorId/cancel-day` |
| Queues | `GET /queues/:doctorId`, `PATCH /:doctorId/call-next`, `POST /:doctorId/emergency` |
| Medical records | `POST /api/v1/medical-records`, `PATCH /:id/finalize` |
| Prescriptions | `POST /api/v1/prescriptions`, `PATCH /:id/dispense` |
| Medicines | `GET /api/v1/medicines?lowStock=true`, `PATCH /:id/stock` |
| Payments | `POST /api/v1/payments`, `GET /mine`, `GET /` |
| Admin | `GET /api/v1/admin/analytics/*`, `/reports/revenue`, `/audit-logs`, `/export/:type` |

## 📄 License

MIT — see the [LICENSE](LICENSE) file.