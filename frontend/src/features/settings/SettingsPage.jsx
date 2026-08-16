import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { User, Palette, Lock, Building2, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react'

import OrgTab from './tabs/OrgTab'
import TeamTab from './tabs/TeamTab'
import ProfileTab from './tabs/ProfileTab'
import SecurityTab from './tabs/SecurityTab'
import AppearanceTab from './tabs/AppearanceTab'
import BillingTab from './tabs/BillingTab'

const TABS = [
  { id: 'org', label: 'Organization', icon: Building2 },
  { id: 'team', label: 'Team', icon: User },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]



// ── Main ───────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sidenavCollapsed, setSidenavCollapsed] = useState(false)

  // Get tab from URL query params, default to 'org'
  const tab = searchParams.get('tab') || 'org'
  const setTab = (newTab) => {
    setSearchParams({ tab: newTab })
  }
  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p>Manage your workspace and preferences</p>
        </div>
      </div>

      <div className="settings-layout">
        <aside className={`settings-sidenav${sidenavCollapsed ? ' collapsed' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 4, borderBottom: '1px solid var(--c-border)' }}>
            {!sidenavCollapsed && <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-text3)', letterSpacing: '0.05em' }}>Settings</div>}
            <button
              onClick={() => setSidenavCollapsed(!sidenavCollapsed)}
              style={{
                padding: '6px 6px',
                background: 'var(--c-surface2)',
                border: '1px solid var(--c-border)',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--c-text2)',
                transition: 'all 0.2s',
                marginLeft: sidenavCollapsed ? 'auto' : '0',
              }}
              title={sidenavCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidenavCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.id}
                className={`settings-sidenav-btn${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
                title={sidenavCollapsed ? t.label : ''}>
                <Icon size={15} />
                {!sidenavCollapsed && <span>{t.label}</span>}
              </button>
            )
          })}
        </aside>

        <main className="settings-content">
          <div className="card">
            <div className="card-body">
              {tab === 'org' && <OrgTab />}
              {tab === 'team' && <TeamTab />}
              {tab === 'profile' && <ProfileTab />}
              {tab === 'security' && <SecurityTab />}
              {tab === 'billing' && <BillingTab />}
              {tab === 'appearance' && <AppearanceTab />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
