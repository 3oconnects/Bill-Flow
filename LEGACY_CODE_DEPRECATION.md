# Legacy Code Deprecation Plan

This document outlines the migration from vanilla JavaScript (`/public/js`) to React (`/src`) with feature flags for parallel running.

## Current State

### Legacy Stack (to be deprecated)
- **Location**: `frontend/public/js/`
- **Technology**: Vanilla JavaScript, jQuery (if used), global state via `window.APP`
- **Pages**: auth, dashboard, customers, vendors, invoices, payments, expenses, reports, settings, roles, warranty, products

### Modern Stack (in progress)
- **Location**: `frontend/src/`
- **Technology**: React 18 + React Router + Zustand + React Query
- **Pages**: auth, dashboard, customers, invoices, expenses, AP, banking, products, reports

## Feature Flag System

Create feature flags to run both stacks in parallel:

```javascript
// frontend/src/lib/featureFlags.js

const LEGACY_FEATURES = {
  // Set to false to use React version
  auth: false,           // React auth ready
  dashboard: false,      // React dashboard ready
  customers: false,      // React customers ready
  invoices: false,       // React invoices ready
  payments: false,       // React payments ready
  expenses: false,       // React expenses ready
  vendors: true,         // Still using legacy
  warranty: true,        // Still using legacy
  reports: false,        // React reports ready
  roles: true,           // Still using legacy
  settings: false,       // React settings ready
  products: false,       // React products ready
  ap: false,             // React AP ready
};

export function useLegacyFeature(feature) {
  return LEGACY_FEATURES[feature] || false;
}

export function isLegacyMode(feature) {
  return process.env.REACT_APP_LEGACY_MODE === 'true' && LEGACY_FEATURES[feature];
}
```

### Usage in Routes

```javascript
// frontend/src/App.jsx

import { useLegacyFeature } from './lib/featureFlags';
import VendorPageReact from './features/vendors/VendorPage';
import VendorPageLegacy from './legacy/pages/vendors';

export function VendorRoute() {
  if (useLegacyFeature('vendors')) {
    // Render legacy vendor page (via iframe or redirect)
    return <iframe src="/public/vendors.html" />;
  }
  return <VendorPageReact />;
}
```

## Migration Timeline

### Phase 1: Week 1-2 (Auth & Core)
- [x] Auth (login/register)
- [x] Dashboard
- [x] Customers

### Phase 2: Week 3-4 (Sales)
- [x] Invoices
- [x] Payments
- [x] Reports

### Phase 3: Week 5-6 (Expenses & Inventory)
- [x] Expenses
- [x] Products
- [x] Inventory

### Phase 4: Week 7-8 (AP & Settings)
- [x] AP (Accounts Payable)
- [x] Organization Settings

### Phase 5: Week 9-10 (Remaining)
- [ ] Vendors (MIGRATE)
- [ ] Roles & Permissions (MIGRATE)
- [ ] Warranty (MIGRATE)
- [ ] Banking/Cash Ledger (MIGRATE)

### Phase 6: Week 11-12 (Cleanup)
- [ ] Remove all legacy JS files
- [ ] Update build process
- [ ] Remove feature flags
- [ ] QA and testing

## Legacy Feature List

| Feature | File | Status | Priority | Effort |
|---------|------|--------|----------|--------|
| **Auth** | `pages/auth.js` | ✅ Migrated | — | — |
| **Dashboard** | `pages/dashboard.js` | ✅ Migrated | — | — |
| **Customers** | `pages/customers.js` | ✅ Migrated | — | — |
| **Invoices** | `pages/invoices.js` | ✅ Migrated | — | — |
| **Payments** | `pages/payments.js` | ✅ Migrated | — | — |
| **Expenses** | `pages/expenses.js` | ✅ Migrated | — | — |
| **Reports** | `pages/reports.js` | ✅ Migrated | — | — |
| **Settings** | `pages/settings.js` | ✅ Migrated | — | — |
| **Products** | `pages/products.js` | ✅ Migrated | — | — |
| **Vendors** | `pages/vendors.js` | ⏳ Pending | High | 4 hrs |
| **Roles** | `pages/roles.js` | ⏳ Pending | High | 6 hrs |
| **Warranty** | `pages/warranty.js` | ⏳ Pending | Medium | 3 hrs |
| **AP (Accounts Payable)** | `pages/ap.js` | ✅ Migrated | — | — |
| **Goods Returns** | — | ✅ Migrated | — | — |

## Running in Parallel

### Serve Both
```bash
npm run dev
# Backend on :3000
# Frontend (React) on :5173
# Legacy on :3000/public/
```

### Feature Flag Modes
```bash
# Full React mode
REACT_APP_LEGACY_MODE=false npm run dev

# Hybrid mode (some legacy, some React)
REACT_APP_LEGACY_MODE=true npm run dev

# Full legacy mode
npm run dev:legacy  # (for testing)
```

### Testing
- Route to legacy page from React nav
- Verify data syncs across stacks
- Test user session persistence
- Check form submissions work from both stacks

## Cleanup Checklist

When ready to remove legacy code:

- [ ] All features migrated to React
- [ ] All tests passing
- [ ] No broken links/redirects
- [ ] Feature flags removed from code
- [ ] Delete `/public/js/` directory
- [ ] Delete `/public/*.html` legacy pages
- [ ] Update build process (no longer serves legacy)
- [ ] Update documentation
- [ ] Tag release as "v2.0.0 - Full React Migration"

## Rollback Plan

If issues arise:

1. Keep legacy code in a separate branch: `legacy-js`
2. Use feature flags to revert problematic features
3. Redeploy previous version while fixing React version
4. Merge fix back to main

## Estimated Timeline

- **Start**: June 2, 2026
- **Phase 5 Complete**: June 30, 2026 (4 weeks)
- **Cleanup**: July 7, 2026
- **Public Release**: July 14, 2026

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Data loss during migration | High | Run parallel, sync validation before delete |
| Broken user experience | High | Feature flags, extensive QA |
| Performance regression | Medium | React Query caching, code splitting |
| Increased bundle size | Medium | Tree-shaking, lazy loading routes |

---

**Owner**: PK  
**Last Updated**: June 2, 2026
