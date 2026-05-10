# BillFlow — Roles & Permissions Improvements

## What Changed

### frontend/public/js/pages/roles.js (full rewrite)

#### UI/UX
- Scoped CSS injected inline — no global conflicts
- Responsive grid layout for all screen sizes
- Card-based role list with color-coded avatars, permission coverage progress bar, and user count
- Click-to-select active state on role cards
- Sticky sub-tab bar with 5 tabs: Manage Roles, Create Role, Assign Roles, Security, Activity Log

#### Permission Selection (Fixed)
- All permission toggles are keyboard-accessible (`tabindex`, `role="checkbox"`, Space/Enter support)
- State class `pt-on` replaces broken `checked` approach — fully decoupled from native checkbox
- "Select All / Clear All" bar at top of permissions panel
- Per-group "All" checkbox syncs group count badge
- Live count badge per group (e.g. "3 / 4")
- 8 permission groups: Dashboard, Products, Invoices, Vendors, Customers, Expenses, Reports, Settings

#### Assign Roles Section (Fixed)
- Owner row dynamically pulls name/email from `APP.currentUser` (real session data)
- Staff rows from `_assignUsers` state (wired to backend `/api/team` in production)
- Search bar filters by name or email
- Status column shows Active / Inactive with colored dot
- Toggle status button per user (fires `PATCH /api/team/:id/status`)
- "Add User" modal with name, email, role assignment
- Role dropdown per user (fires `_updateUserRole`)

#### Security / Password Management (New Section)
- Show/Hide toggle on all password inputs
- Live password strength bar (5 levels: Very Weak → Very Strong)
- 5-rule checklist: 8+ chars, uppercase, lowercase, number, symbol
- Confirm password match indicator
- Validation before submit (all rules must pass)
- Calls real `POST /api/auth/change-password` backend endpoint
- "Forgot Password?" opens modal → `POST /api/auth/forgot-password`
- 2FA toggle + Login Alert Emails toggle (persisted in localStorage)
- Active sessions list with per-session revoke
- Danger Zone: Delete Account

#### Extra
- Role color picker (8 preset colors)
- Clone role button
- Activity log tab with timestamped entries and Clear Log button
- Add User modal with duplicate-email guard
- Toast messages for all actions
- Loading/error fallback for password API calls

### backend/server.js (additions appended)

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/roles` | GET | user | List all roles for org |
| `/api/roles` | POST | admin | Create new role |
| `/api/roles/:id` | PUT | admin | Update role permissions |
| `/api/roles/:id` | DELETE | admin | Delete custom role |
| `/api/team/:id/status` | PATCH | admin | Toggle user active/inactive |
| `/api/team/:id/role` | PATCH | admin | Change user role |
| `/api/auth/forgot-password` | POST | public | Send reset email (stub) |
| `/api/auth/change-password` | POST | user | Change password (existing) |

### frontend/public/js/pages/settings.js
- Removed duplicate `checkPwStrength`, `saveNewPassword`, `toggle2FA`, `toggleLoginAlerts`, `revokeAllSessions` functions (now in roles.js)
- Security tab (`_renderSecurityTab`) kept for the main Settings → Security tab; password section also accessible from Roles → Security sub-tab

## Role-Based Login & Access Control

### What changed

**Backend (`backend/server.js`)**
- `POST /api/team` now accepts `staff` as a valid role (alongside `admin`, `member`)
- `PATCH /api/team/:id/role` now accepts `staff` as a valid role

**Frontend (`frontend/public/js/app.js`)**
- Added `ROLE_PAGE_ACCESS` map — defines which pages each role can visit:
  - **Owner / Admin**: all pages (dashboard, customers, products, invoices, payments, vendors, expenses, reports, settings, marketplace)
  - **Staff / Member**: operational pages only (dashboard, customers, products, invoices, payments, vendors, expenses) — no Settings, no Marketplace
- Added `ROLE_DEFAULT_PAGE` map — after login, each role lands on:
  - **Owner / Admin**: Dashboard
  - **Staff / Member**: Invoices
- `APP.buildNav()` now filters nav items based on the logged-in user's role
- `navigateTo()` now guards against direct navigation to unauthorized pages and redirects to the role's default page

**Frontend (`frontend/public/js/pages/settings.js`)**
- Add Member form now includes **Staff** as a role option with description
- Team table now shows an inline role-change dropdown (Owner only) allowing role changes between Admin / Staff / Member without opening a modal
- New `changeMemberRole(id, role)` function calls `PATCH /api/team/:id/role`

**Frontend (`frontend/public/js/utils.js`)**
- `roleBadge()` now shows proper capitalized labels (Owner, Admin, Staff, Member)

**Frontend (`frontend/public/css/app.css`)**
- Added `.badge-staff` style (green, matching the Staff role color)

### How role-based login works

Each role has its own email + password stored in the `users` table (same as always). When a user logs in:
1. The backend authenticates and returns `{ user: { role, ... }, orgId }`
2. The frontend reads `user.role` and calls `navigateTo(ROLE_DEFAULT_PAGE[role])`
3. The nav is rebuilt showing only pages the role is allowed to access
4. Any attempt to visit a forbidden page is redirected back to the role's default page
