# BillFlow Pro — Monorepo Structure

This is a **monorepo with independent build steps** for the backend and frontend.

## Directory Layout

```
billflow-improved/
├── backend/                    ← Express.js API server
│   ├── server.js               ← Main server entry point
│   ├── routes/                 ← API route handlers
│   ├── db/                     ← Database schema & statements
│   ├── middleware/             ← Authentication, validation, audit logging, rate limiting
│   ├── validators.js           ← Input validation schemas (Zod)
│   ├── swagger.js              ← OpenAPI/Swagger documentation
│   └── utils/                  ← Helper functions
│
├── frontend/                   ← React + Vite SPA
│   ├── src/
│   │   ├── App.jsx
│   │   ├── features/           ← Feature-specific pages
│   │   ├── components/         ← Shared components
│   │   ├── store/              ← Zustand state management
│   │   └── api/                ← Axios API client
│   ├── public/                 ← Static assets
│   ├── vite.config.js
│   └── package.json            ← Frontend dependencies
│
├── package.json                ← Root package (monorepo scripts)
├── README.md                   ← Getting started guide
├── MONOREPO_STRUCTURE.md       ← This file
├── PRODUCT_ANALYSIS.md         ← Product analysis & roadmap
└── vercel.json                 ← Deployment config
```

## Running Locally

### Install dependencies (once)
```bash
npm install
# This runs postinstall hook, which installs frontend deps too
```

### Development Mode (Both servers)
```bash
npm run dev
# Runs backend on :3000 and frontend on :5173 in parallel
```

### Development Mode (Individual)
```bash
# Backend only (port 3000)
npm run dev:backend

# Frontend only (port 5173)
npm run dev:frontend
```

### Production Build
```bash
npm run build
# 1. Builds backend (no-op, Node.js doesn't need compilation)
# 2. Builds frontend (Vite outputs to frontend/dist/)
```

### Testing
```bash
npm run test
# Runs tests in both backend and frontend (when configured)
```

### Linting
```bash
npm run lint
# Lints both backend and frontend (when configured)
```

## API Documentation

Once server is running, visit:
```
http://localhost:3000/api/docs
```

Swagger UI shows all endpoints, request/response schemas, and authentication requirements.

## Build & Deployment

### GitHub Actions (CI/CD)
```yaml
# .github/workflows/build.yml (example)
- Run: npm run lint
- Run: npm run test
- Run: npm run build
- Deploy: npm start on Vercel
```

### Local Build
```bash
npm run build:backend   # Installs & verifies backend
npm run build:frontend  # Builds React app to frontend/dist/
```

### Vercel Deployment
```bash
# Vercel auto-runs: npm install && npm run build
# Then: npm start (starts Node backend)
# Frontend is served as static from frontend/dist/
```

## Middleware & Security

### Validation (Zod)
- All POST/PUT routes use `validate(schema)` middleware
- Catches invalid input before database

### Rate Limiting
```javascript
import { loginLimiter, apiLimiter } from './middleware/rateLimiter';

app.post('/api/auth/login', loginLimiter, handleLogin);
app.get('/api/invoices', apiLimiter, getInvoices);
```

### Audit Logging
```javascript
import { createAuditMiddleware } from './middleware/auditLog';

// All CREATE/UPDATE/DELETE operations logged to audit_logs table
app.use(createAuditMiddleware(auditLogger));
```

## Database Schema

Audit logs table:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT (CREATE|UPDATE|DELETE),
  entity_type TEXT,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Next Steps

- [ ] Add ESLint + Prettier to backend
- [ ] Add unit tests (Jest for backend, Vitest for frontend)
- [ ] Add integration tests (supertest for backend)
- [ ] Add E2E tests (Cypress/Playwright for frontend)
- [ ] Setup GitHub Actions CI/CD
- [ ] Add database connection pooling (pg-pool)
- [ ] Add monitoring/logging (Sentry, Winston)

## Troubleshooting

### Frontend not updating
```bash
# Kill any existing dev processes
# Restart
npm run dev
```

### Port already in use
```bash
# Change ports in dev scripts
# Backend: PORT=8000 npm run dev:backend
# Frontend: VITE_PORT=5174 npm run dev:frontend
```

### Database connection error
```bash
# Ensure PostgreSQL is running
# Check .env has correct DATABASE_URL
```

---

**Last Updated**: June 2, 2026
