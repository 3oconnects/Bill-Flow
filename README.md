# Ozofi Books Pro

> A Zoho Books-inspired, full-stack billing platform built for Indian SMBs — featuring GST-compliant invoicing, accounts payable, inventory, expense tracking, and real-time financial reporting.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

Ozofi Books Pro is a multi-tenant billing platform targeting small and medium businesses in India. It handles the complete billing lifecycle — from raising a quotation to reconciling payments — with built-in GST support, role-based access control, and a modern React frontend.

Key differentiators:
- **India-first**: GST rates (0/5/12/18/28%), GSTIN/PAN capture, state-based tax handling
- **Multi-tenant from day one**: full `org_id` isolation across every database table
- **Accounts Payable module**: vendor bills, credit memos, down payments, reserve invoices
- **Recurring billing**: schedule auto-invoices via Bull/Redis job queues
- **Razorpay integration**: collect payments and handle webhooks in-app

---

## Features

### Sales & Invoicing
- Create, edit, and delete invoices with line-item-level GST
- Draft → Sent → Paid workflow with auto-status updates
- Payment recording (UPI, NEFT, cash, card, cheque)
- Invoice preview and browser print-to-PDF
- Auto-numbering with custom org prefix

### Accounts Payable (AP)
- Vendor bill creation and approval workflow (Bill → Approved → Paid)
- Credit memos (reversals / adjustments)
- Down payments and advance tracking
- Reserve (future-dated) invoices
- Expense-to-bill linking

### Quotations & Sales Orders
- Full quotation lifecycle with conversion to invoices
- Goods returns with refund / credit memo generation and tax recalculation

### Inventory & Products
- Product master with SKU, unit, and tax rate
- Real-time stock tracking (on-hand, reserved, available)
- Category management and bulk import/export

### Expense Management
- 14 expense categories with GST per expense
- Vendor linking and reference tracking
- Date-range filtering and expense reports

### Customer & Vendor Management
- Full CRUD with GSTIN, PAN, and state fields
- Outstanding balance calculation
- Vendor bank details for payment processing

### Reports & Analytics
- Profit & Loss summary
- Revenue vs. Expenses time-series chart (Recharts)
- Invoice breakdown by customer and status
- Top customers / vendors and expense-by-category breakdowns
- Cash flow snapshot

### Multi-Tenancy & Security
- Role-based access control: **Owner > Admin > Staff > Member**
- Session-based auth (7-day cookie, bcrypt cost 12)
- Per-org team management and role assignment
- Rate limiting on auth and API routes (express-rate-limit)
- Full audit logging (CREATE / UPDATE / DELETE to `audit_logs` table)
- Input validation via Zod schemas on every route
- Helmet security headers

### Recurring Billing
- Schedule recurring invoices via Bull queues backed by Redis
- Configurable frequencies (daily, weekly, monthly, custom)

### Payment Gateway
- Razorpay payment link creation, order tracking, and webhook handling

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser / Client                   │
│              React 18 + Vite SPA (:5173)                │
│   Zustand · React Query · React Router · Recharts       │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS / REST JSON
┌───────────────────────────▼─────────────────────────────┐
│               Express 4 API Server (:3000)              │
│  Helmet · CORS · Rate Limiter · Session · Audit Logger  │
│                  Zod Input Validation                   │
├──────────────┬─────────────────────┬────────────────────┤
│   Routes     │      Services       │      Workers       │
│  (per module)│  (business logic)   │  (Bull job queues) │
└──────┬───────┴──────────┬──────────┴──────────┬─────────┘
       │                  │                     │
┌──────▼──────┐   ┌───────▼───────┐   ┌────────▼────────┐
│ PostgreSQL  │   │     Redis     │   │   Razorpay API  │
│  (pg pool)  │   │  (Bull / LRU) │   │  (payments +    │
│  Multi-org  │   │  cache + jobs │   │   webhooks)     │
└─────────────┘   └───────────────┘   └─────────────────┘
```

**Request flow**
1. React client calls `axios` → `/api/*`
2. Express middleware chain: rate-limit → session auth → Zod validate → route handler
3. Route handler calls prepared SQL statements against the PostgreSQL pool
4. Audit middleware logs CREATE / UPDATE / DELETE mutations
5. Recurring billing workers run independently via Bull / Redis queues
6. Frontend state kept in sync via React Query (server state) + Zustand (UI state)

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4.18 |
| Database | PostgreSQL (pg 8.11) |
| Auth | bcryptjs · jsonwebtoken · express-session |
| Job Queues | Bull 4 · Redis 4 |
| Validation | Zod 3 |
| Payments | Razorpay SDK 2.9 |
| API Docs | Swagger UI (OpenAPI 3.0) |
| Testing | Jest 29 · Supertest 7 |

### Frontend
| Layer | Technology |
|---|---|
| Build Tool | Vite 5 |
| Framework | React 18 |
| Routing | React Router DOM 6 |
| State | Zustand 4 |
| Server State | TanStack React Query 5 |
| Forms | React Hook Form 7 + Zod |
| Charts | Recharts 2 |
| Icons | Lucide React |
| HTTP Client | Axios 1.6 |

---

## Database Schema

All tables carry an `org_id UUID` foreign key to enforce multi-tenant data isolation. Below are the core tables:

| Table | Purpose |
|---|---|
| `organizations` | Org profile, GSTIN, PAN, invoice prefix |
| `users` | Credentials, role per org |
| `customers` | AR counterparties (GSTIN, PAN, state) |
| `vendors` | AP counterparties + bank details |
| `products` | Product master (SKU, unit, tax rate) |
| `inventory` | Stock levels (on-hand, reserved, available) |
| `invoices` | Sales invoices (Draft → Sent → Paid) |
| `invoice_items` | Line items with quantity, rate, GST |
| `quotations` | Pre-invoice quotes (convertible to invoices) |
| `payments` | Payment records linked to invoices |
| `ap_bills` | Vendor bills (Bill → Approved → Paid) |
| `ap_bill_items` | AP bill line items |
| `credit_notes` | Invoice reversals / adjustments |
| `expenses` | Business expenses (14 categories) |
| `goods_returns` | Return orders linked to invoices/purchases |
| `recurring_invoices` | Recurring schedule config (frequency, next date) |
| `banking_transactions` | Cash ledger entries |
| `audit_logs` | Immutable mutation log (action, old/new values, IP) |

### Initialising the schema

```bash
npm run db:migrate
# Runs backend/db/migrate.js — creates all tables if they do not exist
```

Versioned migration files live in `backend/db/migrations/` for incremental schema changes.

---

## Project Structure

```
ozofibooks-improved/
├── backend/
│   ├── server.js                 # Express app entry, middleware & route mounting
│   ├── server-PRODUCTION.js      # Hardened production server config
│   ├── auth.js                   # Auth helpers, password hashing
│   ├── db.js                     # Database connection
│   ├── validators.js             # Shared Zod validation schemas
│   ├── swagger.js                # OpenAPI/Swagger spec generation
│   ├── db/
│   │   ├── schema.js             # Table creation DDL
│   │   ├── migrate.js            # Schema initialisation script
│   │   ├── conn.js               # pg Pool configuration
│   │   ├── sqlBuilder.js         # Dynamic SQL builder utilities
│   │   ├── statements/           # Prepared SQL statements (per domain)
│   │   └── migrations/           # Versioned migration files
│   ├── middleware/               # auth, rate limiting, audit logging, validation
│   ├── routes/                   # One route file per module
│   │   ├── auth.js
│   │   ├── invoices.js
│   │   ├── quotations.js
│   │   ├── customers.js
│   │   ├── vendors.js
│   │   ├── ap.js                 # Accounts Payable
│   │   ├── products.js
│   │   ├── payments.js
│   │   ├── expenses.js
│   │   ├── reports.js
│   │   ├── banking.js
│   │   ├── recurring.js
│   │   ├── goodsReturns.js
│   │   ├── warranty.js
│   │   ├── razorpay.js
│   │   └── organization.js
│   ├── services/                 # Business logic layer
│   ├── workers/                  # Bull queue workers (recurring billing etc.)
│   └── tests/                   # Jest integration tests
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx               # Root component and router
│       ├── main.jsx              # Vite entry point
│       ├── api/                  # Axios API client (centralised)
│       ├── components/           # Shared UI (Modal, Toast, Table…)
│       ├── features/             # Feature-first page modules
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── invoices/
│       │   ├── sales/
│       │   ├── ap/               # Accounts Payable
│       │   ├── customers/
│       │   ├── vendors/
│       │   ├── products/
│       │   ├── inventory/
│       │   ├── expenses/
│       │   ├── banking/
│       │   ├── recurring/
│       │   ├── reports/
│       │   ├── goods-returns/
│       │   ├── warranty/
│       │   ├── marketplace/
│       │   ├── settings/
│       │   └── roles/
│       ├── layouts/              # Page shell / sidebar layout
│       ├── store/                # Zustand stores
│       ├── lib/                  # Utilities and helpers
│       └── types/                # Shared TypeScript-style type definitions
│
├── api/                          # Vercel serverless entry adapter
├── package.json                  # Root monorepo scripts
├── vercel.json                   # Vercel deployment config
└── .env.example                  # Environment variable template
```

---

## Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | 18.x |
| npm | 9.x |
| PostgreSQL | 14.x |
| Redis | 6.x (required for recurring billing and caching) |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/ozofibooks-pro.git
cd ozofibooks-pro
```

### 2. Install dependencies

```bash
# Installs both root and frontend dependencies
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your database, Redis, and secrets (see section below)
```

### 4. Initialise the database

Ensure PostgreSQL is running, then:

```bash
npm run db:migrate
```

This creates all tables and seed data in the configured database.

### 5. Start development servers

```bash
npm run dev
# Backend:  http://localhost:3000
# Frontend: http://localhost:5173
```

---
## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start both backend (`:3000`) and frontend (`:5173`) concurrently |
| `npm run dev:backend` | Start only the Express backend with nodemon |
| `npm run dev:frontend` | Start only the Vite dev server |
| `npm start` | Start the backend in production mode |
| `npm run build:frontend` | Build the React app to `frontend/dist/` |
| `npm run db:migrate` | Initialise / migrate the PostgreSQL schema |
| `npm test` | Run backend test suite (Jest) |
| `npm run test:coverage` | Run tests with coverage report |

---

## API Documentation

The backend ships with an auto-generated Swagger UI. Once the server is running, open:

```
http://localhost:3000/api/docs
```

All endpoints, request/response schemas, and authentication requirements are documented there.

---

## Deployment

### Vercel (recommended)

The repository includes a pre-configured `vercel.json`. Push to your connected Git branch and Vercel will:

1. Install dependencies (`npm install`)
2. Build the frontend (`npm run build:frontend` → `frontend/dist/`)
3. Serve the API via `api/index.js` as a serverless function
4. Route all `/api/*` requests to the Node backend and everything else to the SPA

> **Note**: Set all required environment variables in your Vercel project settings before deploying.

### Self-hosted

```bash
# 1. Build the frontend
npm run build:frontend

# 2. Start the server (serves API + static frontend)
NODE_ENV=production npm start
```

Use a reverse proxy (nginx, Caddy) in front of the Node process in production.

---

## Roadmap

### Phase 1 — Stabilisation
- [ ] 70 %+ test coverage (unit + integration via Jest/Supertest)
- [ ] GitHub Actions CI (lint → test → build on every PR)
- [ ] Sentry error tracking integration
- [ ] Complete React migration (remove any remaining legacy JS)

### Phase 2 — High-Impact Features
- [ ] Email delivery — send invoices and payment reminders via Resend
- [ ] Recurring invoice engine — auto-create invoices on Bull schedules
- [ ] Bank reconciliation — match bank transactions to recorded payments
- [ ] Webhook / API — Zapier, Make, and custom integration support
- [ ] Pagination + Redis caching for large data sets

### Phase 3 — Market Expansion
- [ ] Mobile app (React Native)
- [ ] Bulk CSV import for invoices, customers, and products
- [ ] SaaS pricing tiers (Freemium → Pro → Enterprise)
- [ ] Third-party plugin marketplace
- [ ] Advanced GST reports (GSTR-1, GSTR-3B export)

---

## Troubleshooting

### Port already in use

```bash
# Change the backend port
PORT=8000 npm run dev:backend

# Change the frontend port (Vite)
# In frontend/vite.config.js set server.port
npm run dev:frontend
```

### Database connection refused

```bash
# Make sure PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify your .env values match the running Postgres instance
psql -U ozofibooks -d ozofibooks_pro -h localhost
```

### Redis connection error (recurring billing fails to start)

```bash
# Start Redis locally
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:7-alpine

# Verify REDIS_URL in .env
redis-cli ping   # should return PONG
```

### Frontend changes not reflecting

```bash
# Hard-reset Vite's cache
npm run dev:frontend -- --force
```

### Migration fails with "relation already exists"

The migrate script is idempotent (`CREATE TABLE IF NOT EXISTS`). If you see other errors, check that your DB user has `CREATE` privileges:

```sql
GRANT ALL PRIVILEGES ON DATABASE ozofibooks_pro TO ozofibooks;
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push to the branch: `git push origin feat/my-feature`
5. Open a pull request

Please ensure any new API routes include Zod validation and a matching test in `backend/tests/`.

---

## License

MIT © Ozofi Books Pro Contributors
