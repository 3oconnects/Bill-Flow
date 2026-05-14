import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, CreditCard, ShoppingBag,
  Package, TrendingDown, BarChart2, Settings, Landmark, Store,
  ChevronDown, Bell, Search, Menu, LogOut, User, Shield, Award,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTopbarStore } from '@/store/topbarStore'
import { authApi } from '@/api'
import { toast } from '@/store/toastStore'
import { ROLE_PAGE_ACCESS, fmt } from '@/lib/utils'

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', id: 'dashboard' },
  {
    label: 'Customer & Sales', icon: Users, id: 'sales',
    children: [
      { label: 'Customers',  to: '/customers',  id: 'customers' },
      { label: 'Invoices',   to: '/invoices',   id: 'invoices' },
      { label: 'Payments',   to: '/payments',   id: 'payments' },
      { label: 'Warranty',   to: '/warranty',   id: 'warranty' },
    ],
  },
  {
    label: 'Purchase & A/P', icon: ShoppingBag, id: 'purchases',
    children: [
      { label: 'Purchase Management',  to: '/purchases',    id: 'purchase_mgmt' },
      { label: 'Goods Management',     to: '/goods',        id: 'goods_mgmt' },
      { label: 'A/P Handle',           to: '/ap',           id: 'ap_handle' },
      { label: 'Recurring Transaction', to: '/recurring',   id: 'recurring_txn' },
      { label: 'Vendors',              to: '/vendors',      id: 'vendors' },
      { label: 'Marketplace',          to: '/marketplace',  id: 'marketplace' },
    ],
  },
  {
    label: 'Inventory', icon: Package, id: 'inventory',
    children: [
      { label: 'Products', to: '/products', id: 'products' },
    ],
  },
  {
    label: 'Finance', icon: TrendingDown, id: 'finance',
    children: [
      { label: 'Expenses', to: '/expenses', id: 'expenses' },
      { label: 'Reports',  to: '/reports',  id: 'reports' },
    ],
  },
  {
    label: 'Administration', icon: Shield, id: 'admin_group',
    children: [
      { label: 'Roles & Permissions', to: '/roles', id: 'roles' },
    ],
  },
  {
    label: 'Banking', icon: Landmark, id: 'banking_group',
    children: [
      { label: 'Banking', to: '/banking', id: 'banking' },
    ],
  },
]

function NavGroup({ item, allowed, collapsed }) {
  const visibleChildren = item.children.filter((c) => allowed.includes(c.id))
  const [open, setOpen] = useState(false)
  if (!visibleChildren.length) return null
  const Icon = item.icon

  return (
    <div className={`nav-group${open ? ' expanded' : ''}`}>
      <div className={`nav-item has-children${open ? ' active' : ''}`} onClick={() => setOpen((o) => !o)}>
        <Icon size={16} className="nav-icon" />
        {!collapsed && <span>{item.label}</span>}
        {!collapsed && <ChevronDown className="nav-arrow" />}
      </div>
      {!collapsed && (
        <div className="nav-children">
          {visibleChildren.map((c) => (
            <NavLink key={c.id} to={c.to}
              className={({ isActive }) => `nav-sub-item${isActive ? ' active' : ''}`}>
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AppLayout() {
  const { user, org, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const allowed = ROLE_PAGE_ACCESS[user?.role] || ROLE_PAGE_ACCESS.member

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
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
      {/* Sidebar */}
      <aside id="sidebar" className={collapsed ? 'collapsed' : ''}>
        {/* Unified Sidebar Header */}
        <div className="sidebar-header" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
          <div className="org-avatar">
            {collapsed ? 'B' : fmt.initials(org?.name || 'B')}
          </div>
          {!collapsed && (
            <div className="org-info">
              <div className="org-name" style={{ fontSize: 13, fontWeight: 700 }}>{org?.name || 'BillFlow Pro'}</div>
              <div className="org-role" style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase' }}>{user?.role}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map((item) =>
            item.children ? (
              <NavGroup key={item.id} item={item} allowed={allowed} collapsed={collapsed} />
            ) : allowed.includes(item.id) ? (
              <NavLink key={item.id} to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <item.icon size={16} className="nav-icon" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ) : null
          )}
        </nav>

        {/* Footer Nav */}
        <div className="sidebar-footer">
          {allowed.includes('settings') && (
            <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Settings size={16} className="nav-icon" />
              {!collapsed && <span>Settings</span>}
            </NavLink>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrap">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-menu-btn" onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
              <Menu size={20} />
            </button>
            <div className="topbar-page-ctx">
              <div className="topbar-title">{useTopbarStore((s) => s.title)}</div>
              <div className="topbar-subtitle">{useTopbarStore((s) => s.subtitle)}</div>
            </div>
          </div>

          <div className="topbar-center">
            <div className="topbar-search-wrap">
              <Search className="topbar-search-icon" />
              <input type="text" className="topbar-search-input" placeholder="Search anything..." />
              <div className="topbar-search-kbd">
                <span>⌘</span><span>K</span>
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-actions">
              {useTopbarStore((s) => s.actions)}
            </div>
            
            <div className="topbar-divider" />

            <button className="topbar-bell" title="Notifications">
              <Bell size={18} />
              <span className="topbar-bell-dot" />
            </button>

            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <div className="topbar-user" onClick={() => setUserMenuOpen((o) => !o)}>
                <div>
                  <div className="topbar-user-name">{user?.name?.toUpperCase()}</div>
                  <div className="topbar-user-role">{user?.role}</div>
                </div>
                <div className="topbar-avatar">{fmt.initials(user?.name)}</div>
              </div>
              {userMenuOpen && (
                <div className="topbar-user-dropdown">
                  <button onClick={() => { navigate('/settings'); setUserMenuOpen(false) }}>
                    Settings
                  </button>
                  <button onClick={() => { navigate('/settings?tab=profile'); setUserMenuOpen(false) }}>
                    Profile
                  </button>
                  {(user?.role === 'owner' || user?.role === 'admin') && (
                    <button onClick={() => { navigate('/roles'); setUserMenuOpen(false) }}>
                      Roles & Permissions
                    </button>
                  )}
                  <button className="btn-logout" onClick={handleLogout}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
