import { useState, useRef, useEffect, useMemo } from 'react'
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom'
import {
  // Core
  LayoutDashboard,
  // Sales
  Users, FileSignature, FileText, CreditCard, FileMinus, RefreshCcw, ShieldCheck,
  // Purchasing
  Building2, ShoppingCart, PackageCheck, PackageX, Receipt, Banknote, BarChart3,
  // Inventory
  Package, Layers, ArrowRightLeft, DollarSign, AlertTriangle, PieChart,
  // Banking
  Landmark, Wallet, ArrowDownLeft, UsersRound, ArrowUpRight, GitMerge,
  TrendingUp, Lightbulb,
  // Finance
  TrendingDown, Calculator, LineChart, BookOpen, ClipboardList,
  FileBarChart, ScrollText,
  // Administration
  Settings, UserCog, Shield, GitBranch, Plug, SlidersHorizontal,
  // Layout chrome
  ChevronDown, Bell, Search, Menu, LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTopbarStore } from '@/store/topbarStore'
import { authApi } from '@/api'
import { toast } from '@/store/toastStore'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ROLE_PAGE_ACCESS, fmt } from '@/lib/utils'

// ── NAV configuration — new architecture ─────────────────────────────────────
const NAV = [
  {
    label: 'Dashboard', icon: LayoutDashboard,
    to: '/dashboard', id: 'dashboard', section: null,
  },

  // Sales
  {
    label: 'Sales', icon: FileText, id: 'sales_group', section: 'Sales',
    children: [
      { label: 'Customers',         to: '/customers',    id: 'customers',        icon: Users },
      { label: 'Quotations',        to: '/quotations',   id: 'quotations',       icon: FileSignature },
      { label: 'Invoices',          to: '/invoices',     id: 'invoices',         icon: FileText },
      { label: 'Payments Received', to: '/payments',     id: 'payments_received',icon: CreditCard },
      { label: 'Credit Notes',      to: '/credit-notes', id: 'credit_notes',     icon: FileMinus },
      { label: 'Recurring Billing', to: '/recurring',    id: 'recurring_billing',icon: RefreshCcw },
      { label: 'Warranty',          to: '/warranty',     id: 'warranty',         icon: ShieldCheck },
    ],
  },

  // Purchasing
  {
    label: 'Purchasing', icon: ShoppingCart, id: 'purchasing_group', section: 'Purchasing',
    children: [
      { label: 'Vendors',               to: '/vendors',               id: 'vendors',              icon: Building2 },
      { label: 'Purchase Orders',       to: '/purchases',             id: 'purchase_orders',      icon: ShoppingCart },
      { label: 'Goods Management',      to: '/goods',                 id: 'goods_mgmt',           icon: PackageCheck },
      { label: 'Goods Returns',         to: '/goods-returns',         id: 'goods_returns',        icon: PackageX },
      { label: 'Accounts Payable',      to: '/ap',                    id: 'accounts_payable',     icon: Receipt },
      { label: 'Vendor Payments',       to: '/vendor-payments',       id: 'vendor_payments',      icon: Banknote },
      { label: 'Procurement Analytics', to: '/procurement-analysis',  id: 'procurement_analytics',icon: BarChart3 },
    ],
  },

  // Inventory
  {
    label: 'Inventory', icon: Package, id: 'inventory_group', section: 'Inventory',
    children: [
      { label: 'Products',            to: '/products',            id: 'products',           icon: Package },
      { label: 'Stock Overview',      to: '/stock-overview',      id: 'stock_overview',     icon: Layers },
      { label: 'Stock Movements',     to: '/stock-movements',     id: 'stock_movements',    icon: ArrowRightLeft },
      { label: 'Stock Valuation',     to: '/stock-valuation',     id: 'stock_valuation',    icon: DollarSign },
      { label: 'Low Stock Alerts',    to: '/low-stock',           id: 'low_stock_alerts',   icon: AlertTriangle },
      { label: 'Inventory Analytics', to: '/inventory-analytics', id: 'inventory_analytics',icon: PieChart },
    ],
  },

  // Banking
  {
    label: 'Banking', icon: Landmark, id: 'banking_group', section: 'Banking',
    children: [
      { label: 'Banking Overview',   to: '/banking',                  id: 'banking_overview',        icon: Landmark },
      { label: 'Bank Accounts',      to: '/bank-accounts',            id: 'bank_accounts',           icon: Wallet },
      { label: 'Transactions',       to: '/cash-ledger',              id: 'bank_transactions',       icon: ArrowDownLeft },
      { label: 'Collections Center', to: '/collections',              id: 'collections_center',      icon: UsersRound },
      { label: 'Vendor Payments',    to: '/banking-vendor-payments',  id: 'banking_vendor_payments', icon: ArrowUpRight },
      { label: 'Reconciliation',     to: '/reconciliation',           id: 'reconciliation_center',   icon: GitMerge },
      { label: 'Cash Flow Forecast', to: '/cash-forecast',            id: 'cash_flow_forecast',      icon: TrendingUp },
      { label: 'Banking Insights',   to: '/banking-insights',         id: 'banking_insights',        icon: Lightbulb },
    ],
  },

  // Finance
  {
    label: 'Finance', icon: TrendingDown, id: 'finance_group', section: 'Finance',
    children: [
      { label: 'Expenses',          to: '/expenses',  id: 'expenses',          icon: TrendingDown },
      { label: 'Budget Planner',    to: '/budget',    id: 'budget_planner',    icon: Calculator },
      { label: 'GST Center',        to: '/gst',       id: 'gst_center',        icon: ScrollText },
      { label: 'TDS Tracker',       to: '/tds',       id: 'tax_reports',       icon: ClipboardList },
      { label: 'Cash Ledger',       to: '/cash-ledger', id: 'bank_transactions', icon: BookOpen },
      { label: 'Reports',           to: '/reports',   id: 'profit_loss',       icon: LineChart },
      { label: 'Audit Logs',        to: '/audit-logs',id: 'audit_logs',        icon: FileBarChart },
    ],
  },

  // Administration
  {
    label: 'Administration', icon: Settings, id: 'admin_group', section: 'Administration',
    children: [
      // settings, team, security all live inside SettingsPage tabs
      { label: 'Organization',        to: '/settings?tab=org',      id: 'org_settings',       icon: Settings },
      { label: 'Team & Roles',        to: '/roles',                 id: 'roles',              icon: Shield },
      { label: 'Appearance',          to: '/settings?tab=appearance',id: 'preferences',        icon: SlidersHorizontal },
      { label: 'Approval Workflows',  to: '/approvals',             id: 'approval_workflows', icon: GitBranch },
      { label: 'Integrations',        to: '/integrations',          id: 'integrations',       icon: Plug },
    ],
  },
]

// ── NavGroup ──────────────────────────────────────────────────────────────────
function NavGroup({ item, allowed, collapsed }) {
  const location = useLocation()
  const visible = item.children.filter(c => allowed.includes(c.id))
  if (!visible.length) return null

  // Check if child is active by comparing full path including query params
  const isChildActive = visible.some(c => {
    const childPath = c.to.split('?')[0]
    const childQuery = c.to.split('?')[1]
    const currentPath = location.pathname
    const currentQuery = location.search.substring(1) // Remove leading ?

    const pathMatches = currentPath === childPath

    // If child has query params, both path and query must match
    if (childQuery) {
      return pathMatches && currentQuery === childQuery
    }

    // If no query params, just check path (but ensure no other query params exist)
    return pathMatches && !location.search
  })

  // Open state persists across navigation — only initialised from active route.
  // No useEffect so navigation never causes a close/reopen flash.
  const [open, setOpen] = useState(() => isChildActive)

  const Icon = item.icon

  return (
    <div className={`nav-group${open ? ' expanded' : ''}`}>
      <div
        className="nav-item has-children"
        onClick={() => setOpen(o => !o)}
        style={{ userSelect: 'none' }}
      >
        <Icon size={15} className="nav-icon" />
        {!collapsed && <span>{item.label}</span>}
        {!collapsed && <ChevronDown className="nav-arrow" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
      </div>

      {!collapsed && open && (
        <div className="nav-children" style={{ height: 'auto', paddingTop: 2, paddingBottom: 6 }}>
          {visible.map(c => {
            const CIcon = c.icon
            // Custom active detection for query params
            const childPath = c.to.split('?')[0]
            const childQuery = c.to.split('?')[1]
            const isItemActive = location.pathname === childPath &&
              (childQuery ? location.search === `?${childQuery}` : !location.search)

            return (
              <NavLink
                key={c.id}
                to={c.to}
                className={`nav-sub-item${isItemActive ? ' active' : ''}`}
              >
                {CIcon && <CIcon size={12} style={{ flexShrink: 0, opacity: 0.65 }} />}
                <span>{c.label}</span>
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── AppLayout ─────────────────────────────────────────────────────────────────
export default function AppLayout() {
  const { user, org, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed]       = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const allowed = ROLE_PAGE_ACCESS[user?.role] || ROLE_PAGE_ACCESS.member

  useEffect(() => {
    const handler = e => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target))
        setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="app-layout">

      {/* ── Sidebar ── */}
      <aside id="sidebar" className={collapsed ? 'collapsed' : ''}>

        {/* Org header */}
        <div className="sidebar-header" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
          <div className="org-avatar">
            {collapsed ? 'B' : fmt.initials(org?.name || 'B')}
          </div>
          {!collapsed && (
            <div className="org-info">
              <div className="org-name">{org?.name || 'BillFlow ERP'}</div>
              <div className="org-role">{user?.role}</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {NAV.map(item => {
            if (!item.children) {
              if (!allowed.includes(item.id)) return null
              // Custom active detection for query params
              const itemPath = item.to.split('?')[0]
              const itemQuery = item.to.split('?')[1]
              const isItemActive = location.pathname === itemPath &&
                (itemQuery ? location.search === `?${itemQuery}` : !location.search)

              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className={`nav-item${isItemActive ? ' active' : ''}`}
                >
                  <item.icon size={15} className="nav-icon" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              )
            }

            const visible = item.children.filter(c => allowed.includes(c.id))
            if (!visible.length) return null

            return (
              <NavGroup key={item.id} item={item} allowed={allowed} collapsed={collapsed} />
            )
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer-nav">
          <div className="nav-item btn-logout" onClick={handleLogout} style={{ cursor: 'pointer' }}>
            <LogOut size={15} className="nav-icon" />
            {!collapsed && <span>Sign Out</span>}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-menu-btn" onClick={() => setCollapsed(c => !c)}>
              <Menu size={20} />
            </button>
            <div className="topbar-page-ctx">
              <div className="topbar-title">{useTopbarStore(s => s.title)}</div>
              <div className="topbar-subtitle">{useTopbarStore(s => s.subtitle)}</div>
            </div>
          </div>

          <div className="topbar-center">
            <div className="topbar-search-wrap">
              <Search className="topbar-search-icon" />
              <input type="text" className="topbar-search-input" placeholder="Search anything..." />
              <div className="topbar-search-kbd"><span>⌘</span><span>K</span></div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-actions">{useTopbarStore(s => s.actions)}</div>
            <div className="topbar-divider" />
            <button className="topbar-bell" title="Notifications">
              <Bell size={18} />
              <span className="topbar-bell-dot" />
            </button>
            <ThemeToggle />

            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <div className="topbar-user" onClick={() => setUserMenuOpen(o => !o)}>
                <div className="topbar-user-info">
                  <div className="topbar-user-name">{user?.name?.toUpperCase()}</div>
                  <div className="topbar-user-role">{user?.role}</div>
                </div>
                <div className="topbar-avatar">{fmt.initials(user?.name)}</div>
              </div>
              {userMenuOpen && (
                <div className="topbar-user-dropdown">
                  <button onClick={() => { navigate('/settings'); setUserMenuOpen(false) }}>
                    Organization Settings
                  </button>
                  <button onClick={() => { navigate('/team'); setUserMenuOpen(false) }}>
                    Team Members
                  </button>
                  {['owner', 'admin'].includes(user?.role) && (
                    <button onClick={() => { navigate('/roles'); setUserMenuOpen(false) }}>
                      Roles &amp; Permissions
                    </button>
                  )}
                  <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
