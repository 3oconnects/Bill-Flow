# BillFlow Pro — React Frontend Setup

## Quick Start

### 1. Install frontend dependencies
```bash
cd frontend
npm install
```

### 2. Start the backend (from root)
```bash
npm run dev:backend
# → Backend runs on http://localhost:3001
```

### 3. Start the React frontend (in a new terminal)
```bash
npm run dev:frontend
# → Vite dev server on http://localhost:5173
# → API calls proxied to localhost:3001
```

---

## Frontend Structure

```
frontend/
├── index.html              ← Vite HTML entry
├── vite.config.js          ← Vite config (proxy /api → :3001, alias @/ → src/)
├── package.json            ← React 18 + dependencies
└── src/
    ├── main.jsx            ← React entry (QueryClient + BrowserRouter)
    ├── App.jsx             ← Root router + session bootstrap + RBAC guards
    ├── index.css           ← Global design system (dark theme, tokens, components)
    ├── api/
    │   └── index.js        ← Axios client + all 40+ API functions
    ├── store/
    │   ├── authStore.js    ← Zustand: user/org session state
    │   └── toastStore.js   ← Zustand: toast notifications
    ├── lib/
    │   └── utils.js        ← fmt helpers, ROLE_PAGE_ACCESS, constants
    ├── components/
    │   ├── Modal.jsx       ← Reusable modal
    │   ├── ToastContainer.jsx ← Toast UI
    │   └── ui.jsx          ← Spinner, PageLoading, EmptyState, Badge
    ├── layouts/
    │   └── AppLayout.jsx   ← Sidebar + Topbar + Outlet
    └── features/
        ├── auth/           ← Login + Register
        ├── dashboard/      ← KPIs + charts
        ├── customers/      ← List + Form
        ├── vendors/        ← List + Form
        ├── products/       ← List + Form
        ├── invoices/       ← List with status tabs
        ├── payments/       ← List + Record form
        ├── expenses/       ← List + Form
        ├── reports/        ← P&L + charts
        ├── settings/       ← Org settings + Team management
        ├── banking/        ← Placeholder
        └── marketplace/    ← Placeholder
```

## Tech Stack

| Package | Purpose |
|---|---|
| React 18 | UI framework |
| Vite 5 | Build tool + dev server |
| React Router v6 | Client-side routing |
| Zustand | Auth + Toast state |
| TanStack Query v5 | Server state caching |
| Axios | HTTP client |
| React Hook Form | Form management |
| Recharts | Charts (Line, Pie, Bar) |
| Lucide React | Icons |
