import { useState } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { useEffect } from 'react'
import {
  Store, Search, ShieldCheck, Zap, Box, Truck, X, CheckCircle2,
  Settings, ExternalLink, Star, Download, Trash2, RefreshCw,
  CreditCard, Package, BarChart2, FileText, Globe, Bell
} from 'lucide-react'

// ── Full integration catalogue ──────────────────────────────────────────
const ALL_INTEGRATIONS = [
  {
    id: 1, name: 'Razorpay', author: 'Razorpay Software Pvt Ltd',
    cat: 'Payment Gateway', rating: 4.9, reviews: 2840,
    version: '3.2.1', size: '2.4 MB',
    desc: 'Enterprise-grade payment processing with deep BillFlow integration. Accept UPI, cards, netbanking, and wallets. Invoices are auto-reconciled when payments land.',
    features: ['Auto invoice reconciliation', 'UPI, Cards, NetBanking, Wallets', 'Webhook-based payment sync', 'Refund management', 'Payment links on invoices'],
    icon: '₹', color: 'linear-gradient(135deg, #072654, #1a6be8)',
    badge: 'Partner', badgeColor: 'var(--c-primary)',
    tags: ['UPI', 'Reconciliation'],
    screenshots: ['Dashboard', 'Payment Links', 'Reconciliation'],
  },
  {
    id: 2, name: 'Stripe Global', author: 'Stripe Inc.',
    cat: 'Payment Gateway', rating: 4.8, reviews: 1920,
    version: '2.8.0', size: '3.1 MB',
    desc: 'Accept international payments in 135+ currencies. Automatically converts currencies, syncs live exchange rates, and maps payments to BillFlow invoices.',
    features: ['135+ currencies supported', 'Live exchange rate sync', 'Auto-match to invoices', 'Subscription billing', 'Smart retries for failed payments'],
    icon: 'S', color: 'linear-gradient(135deg, #635bff, #00d4ff)',
    badge: 'Verified', badgeColor: 'var(--c-green)',
    tags: ['Global', 'FX Sync'],
  },
  {
    id: 3, name: 'Delhivery Logistics', author: 'Delhivery Ltd.',
    cat: 'Logistics', rating: 4.7, reviews: 870,
    version: '1.5.2', size: '1.8 MB',
    desc: 'Automate e-way bill generation and track shipments directly from your Goods Issue documents in BillFlow. Reduces dispatch errors by 90%.',
    features: ['Auto e-way bill on dispatch', 'Real-time shipment tracking', 'Delivery confirmation sync', 'Returns management', 'Pan-India coverage'],
    icon: <Truck size={22} color="white" />, color: 'linear-gradient(135deg, #ea4335, #ff7b00)',
    badge: 'Verified', badgeColor: 'var(--c-green)',
    tags: ['E-Way Bill', 'Tracking'],
  },
  {
    id: 4, name: 'Zoho CRM Sync', author: 'BillFlow Connect',
    cat: 'CRM', rating: 4.6, reviews: 530,
    version: '2.1.0', size: '1.2 MB',
    desc: 'Two-way sync of customers, credit limits, and sales orders between BillFlow and Zoho CRM. Changes in either system reflect instantly in the other.',
    features: ['Bi-directional customer sync', 'Credit limit enforcement', 'Sales order import', 'Contact deduplication', 'Activity log sync'],
    icon: <Box size={22} color="white" />, color: 'linear-gradient(135deg, #009688, #4db6ac)',
    badge: 'Verified', badgeColor: 'var(--c-green)',
    tags: ['Sync', 'Customers'],
  },
  {
    id: 5, name: 'Tally ERP Exporter', author: 'BillFlow Connect',
    cat: 'Accounting', rating: 4.9, reviews: 3200,
    version: '4.0.1', size: '0.9 MB',
    desc: 'One-click export of all journal entries, invoices, and payment receipts in Tally XML format. Supports Tally Prime and Tally ERP 9.',
    features: ['Tally Prime & ERP 9 support', 'Journal entry export', 'GST ledger mapping', 'Scheduled auto-export', 'Error validation before export'],
    icon: 'T', color: 'linear-gradient(135deg, #ffb300, #ff8f00)',
    badge: 'Partner', badgeColor: 'var(--c-primary)',
    tags: ['Export', 'Compliance'],
  },
  {
    id: 6, name: 'GST Suvidha (ClearTax)', author: 'Defmacro Software Pvt Ltd',
    cat: 'Taxation', rating: 4.8, reviews: 4100,
    version: '5.3.0', size: '2.0 MB',
    desc: 'Direct GSTR-1 and GSTR-3B filing from BillFlow. Real-time GSTIN validation, auto-reconcile with GSTR-2A, and ITC claim management.',
    features: ['GSTR-1 & GSTR-3B filing', 'Real-time GSTIN validation', 'GSTR-2A auto-reconciliation', 'ITC management', 'E-invoice IRN generation'],
    icon: <ShieldCheck size={22} color="white" />, color: 'linear-gradient(135deg, #3f51b5, #5c6bc0)',
    badge: 'Partner', badgeColor: 'var(--c-primary)',
    tags: ['Tax', 'Filing'],
  },
  {
    id: 7, name: 'WhatsApp Business', author: 'Meta Platforms Inc.',
    cat: 'Messaging', rating: 4.7, reviews: 6800,
    version: '1.4.0', size: '1.1 MB',
    desc: 'Send invoices, payment reminders, and delivery notifications directly via WhatsApp Business API. Customers receive and pay from their phone instantly.',
    features: ['Invoice delivery via WhatsApp', 'Payment reminder automation', 'Delivery notifications', 'Two-way customer replies', 'Read receipts'],
    icon: <Bell size={22} color="white" />, color: 'linear-gradient(135deg, #25D366, #128C7E)',
    badge: 'Verified', badgeColor: 'var(--c-green)',
    tags: ['Messaging', 'Reminders'],
  },
  {
    id: 8, name: 'Shiprocket', author: 'Shiprocket Pvt Ltd',
    cat: 'Logistics', rating: 4.5, reviews: 1400,
    version: '2.3.1', size: '2.2 MB',
    desc: 'Connect 17+ courier partners. Auto-generate shipping labels and e-way bills from BillFlow sales orders. Track all shipments in one dashboard.',
    features: ['17+ courier integrations', 'Auto shipping label generation', 'Weight and dimension sync', 'COD reconciliation', 'NDR management'],
    icon: <Package size={22} color="white" />, color: 'linear-gradient(135deg, #f97316, #ef4444)',
    badge: 'Verified', badgeColor: 'var(--c-green)',
    tags: ['Shipping', 'Multi-courier'],
  },
  {
    id: 9, name: 'PhonePe for Business', author: 'PhonePe Pvt Ltd',
    cat: 'Payment Gateway', rating: 4.6, reviews: 2100,
    version: '1.9.0', size: '1.5 MB',
    desc: 'Accept UPI payments via PhonePe QR codes and payment links. Auto-reconcile with invoices and get instant settlement notifications.',
    features: ['QR code generation per invoice', 'UPI payment links', 'Instant settlement alerts', 'Auto invoice reconciliation', 'Refund processing'],
    icon: 'P', color: 'linear-gradient(135deg, #5f259f, #8b2fc9)',
    badge: 'Verified', badgeColor: 'var(--c-green)',
    tags: ['UPI', 'QR Payments'],
  },
  {
    id: 10, name: 'Google Analytics', author: 'Google LLC',
    cat: 'Analytics', rating: 4.4, reviews: 910,
    version: '1.2.0', size: '0.6 MB',
    desc: 'Track BillFlow usage metrics, invoice open rates, and payment conversion funnels in your Google Analytics 4 dashboard.',
    features: ['Invoice open rate tracking', 'Payment conversion funnel', 'Customer behaviour insights', 'Custom event tracking', 'GA4 dashboard integration'],
    icon: <BarChart2 size={22} color="white" />, color: 'linear-gradient(135deg, #f9a825, #f57f17)',
    badge: 'Verified', badgeColor: 'var(--c-green)',
    tags: ['Analytics', 'Reporting'],
  },
  {
    id: 11, name: 'Salesforce CRM', author: 'Salesforce Inc.',
    cat: 'CRM', rating: 4.5, reviews: 760,
    version: '3.0.0', size: '2.8 MB',
    desc: 'Sync BillFlow customers, invoices, and payment history with Salesforce. Sales teams see real-time AR data alongside their pipeline.',
    features: ['Customer & contact sync', 'Invoice history in CRM', 'Opportunity-to-invoice flow', 'AR ageing in Salesforce', 'Automated follow-up tasks'],
    icon: <Globe size={22} color="white" />, color: 'linear-gradient(135deg, #00a1e0, #0076b6)',
    badge: 'Verified', badgeColor: 'var(--c-green)',
    tags: ['CRM', 'Sales'],
  },
  {
    id: 12, name: 'Xero Accounting', author: 'Xero Ltd.',
    cat: 'Accounting', rating: 4.7, reviews: 1380,
    version: '2.5.0', size: '1.7 MB',
    desc: 'Push BillFlow invoices, bills, and payments into Xero automatically. Keep your books reconciled in real time without manual data entry.',
    features: ['Invoice push to Xero', 'Bill and expense sync', 'Bank feed reconciliation', 'Chart of accounts mapping', 'Multi-currency support'],
    icon: <FileText size={22} color="white" />, color: 'linear-gradient(135deg, #00b2e3, #006d87)',
    badge: 'Verified', badgeColor: 'var(--c-green)',
    tags: ['Accounting', 'Sync'],
  },
]

const CATEGORIES = ['All', 'Payment Gateway', 'Logistics', 'Accounting', 'Taxation', 'CRM', 'Messaging', 'Analytics']

function StarRating({ rating }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#f59e0b' }}>
      <Star size={11} fill="#f59e0b" stroke="none" />
      {rating.toFixed(1)}
    </span>
  )
}

function IntegrationDrawer({ item, installed, onInstall, onUninstall, onClose }) {
  const [installing, setInstalling] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const handleInstall = async () => {
    setInstalling(true)
    await new Promise(r => setTimeout(r, 1200))
    onInstall(item.id)
    setInstalling(false)
  }

  const handleUninstall = () => {
    if (window.confirm(`Uninstall ${item.name}? This will disconnect the integration.`)) {
      onUninstall(item.id)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: 480, height: '100vh', background: 'var(--c-surface)',
        borderLeft: '1px solid var(--c-border)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.2s ease',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, background: item.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800, fontSize: 20, flexShrink: 0,
              }}>
                {typeof item.icon === 'string' ? item.icon : item.icon}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 2 }}>by {item.author}</div>
              </div>
            </div>
            <button className="topbar-icon-btn" onClick={onClose}><X size={16} /></button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: item.badge === 'Partner' ? 'var(--c-primary)' : 'var(--c-green-lt)',
              color: item.badge === 'Partner' ? 'white' : 'var(--c-green)',
            }}>{item.badge}</span>
            <StarRating rating={item.rating} />
            <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>{item.reviews.toLocaleString()} reviews</span>
            <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>v{item.version}</span>
            <span style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: 'var(--c-surface2)', color: 'var(--c-text2)',
            }}>{item.cat}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--c-border)', padding: '0 24px', flexShrink: 0 }}>
          {['overview', 'features', 'settings'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 12, textTransform: 'capitalize',
              color: activeTab === t ? 'var(--c-primary)' : 'var(--c-text3)',
              borderBottom: `2px solid ${activeTab === t ? 'var(--c-primary)' : 'transparent'}`,
              marginBottom: -1,
            }}>{t}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {activeTab === 'overview' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--c-text2)', lineHeight: 1.7, marginBottom: 20 }}>{item.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {item.tags.map(t => (
                  <span key={t} style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--c-primary-lt)', color: 'var(--c-primary)', fontSize: 11, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>What's Included</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {item.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--c-surface2)', borderRadius: 8 }}>
                    <CheckCircle2 size={15} color="var(--c-green)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>All Features</div>
              {item.features.map((f, i) => (
                <div key={f} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < item.features.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--c-primary-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={13} color="var(--c-primary)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{f}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              {installed ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#d1fae5', borderRadius: 10, marginBottom: 20 }}>
                    <CheckCircle2 size={18} color="var(--c-green)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#065f46' }}>{item.name} is installed</div>
                      <div style={{ fontSize: 11, color: '#047857' }}>Active and syncing with BillFlow</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Configuration</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">API Key</label>
                      <input className="form-input sm" type="password" placeholder="••••••••••••••••" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Webhook URL</label>
                      <input className="form-input sm" readOnly value={`https://billflow.app/webhooks/${item.name.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontFamily: 'monospace', fontSize: 11 }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sync Frequency</label>
                      <select className="form-select sm">
                        <option>Real-time (webhook)</option>
                        <option>Every 15 minutes</option>
                        <option>Every hour</option>
                        <option>Daily</option>
                      </select>
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 4 }}>
                      <Settings size={14} /> Save Configuration
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Settings size={40} style={{ color: 'var(--c-border)', margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Not installed</div>
                  <div style={{ fontSize: 13, color: 'var(--c-text3)' }}>Install this integration to configure settings.</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--c-border)', display: 'flex', gap: 10, flexShrink: 0 }}>
          {installed ? (
            <>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleUninstall}>
                <Trash2 size={14} /> Uninstall
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setActiveTab('settings')}>
                <Settings size={14} /> Configure
              </button>
            </>
          ) : (
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleInstall} disabled={installing}>
              {installing
                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Installing…</>
                : <><Download size={14} /> Install {item.name}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MarketplacePage() {
  const { setContext, clear } = useTopbarStore()

  const [search,      setSearch]      = useState('')
  const [category,    setCategory]    = useState('All')
  const [installed,   setInstalled]   = useState(new Set([1, 5]))  // Razorpay & Tally pre-installed
  const [selected,    setSelected]    = useState(null)
  const [showInstalled, setShowInstalled] = useState(false)

  useEffect(() => {
    setContext('Marketplace', 'App Integrations')
    return clear
  }, [])

  const handleInstall   = (id) => setInstalled(p => new Set([...p, id]))
  const handleUninstall = (id) => setInstalled(p => { const n = new Set(p); n.delete(id); return n })

  const visible = ALL_INTEGRATIONS.filter(item => {
    if (showInstalled && !installed.has(item.id)) return false
    const matchCat = category === 'All' || item.cat === category
    const q = search.toLowerCase()
    const matchSearch = !q || item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q) || item.tags.some(t => t.toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  return (
    <div>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Hero */}
      <div className="mkt-hero">
        <div className="mkt-hero-bg" />
        <div className="mkt-hero-inner">
          <div className="mkt-hero-left">
            <div className="mkt-badge"><Zap size={12} /> App Marketplace</div>
            <h1 className="mkt-hero-title">Connect Your <span>Business Tools</span></h1>
            <p className="mkt-hero-sub">Browse verified integrations — payment gateways, logistics partners, accounting tools, and more.</p>
            <div className="mkt-hero-search">
              <Search className="mkt-search-icon" />
              <input
                className="mkt-search-input"
                placeholder="Search integrations, payment gateways, logistics..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCategory('All') }}
              />
            </div>
          </div>
          <div className="mkt-stats">
            <div className="mkt-stat">
              <div className="mkt-stat-num">{ALL_INTEGRATIONS.length}</div>
              <div className="mkt-stat-label">Integrations</div>
            </div>
            <div className="mkt-stat-divider" />
            <div className="mkt-stat">
              <div className="mkt-stat-num mkt-stat-active">{installed.size}</div>
              <div className="mkt-stat-label">Installed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div className="mkt-filters" style={{ margin: 0 }}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={'mkt-filter-btn' + (category === c ? ' active' : '')}
              onClick={() => { setCategory(c); setShowInstalled(false) }}
            >
              {c}
              {c !== 'All' && (
                <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7 }}>
                  ({ALL_INTEGRATIONS.filter(i => i.cat === c).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          className={'btn btn-ghost btn-sm' + (showInstalled ? ' btn-active' : '')}
          style={{ background: showInstalled ? 'var(--c-primary-lt)' : '', color: showInstalled ? 'var(--c-primary)' : '', border: showInstalled ? '1.5px solid var(--c-primary)' : '', gap: 6, flexShrink: 0 }}
          onClick={() => { setShowInstalled(!showInstalled); setCategory('All') }}
        >
          <CheckCircle2 size={14} />
          Installed ({installed.size})
        </button>
      </div>

      {/* Results count */}
      {(search || category !== 'All' || showInstalled) && (
        <div style={{ fontSize: 12, color: 'var(--c-text3)', marginBottom: 14 }}>
          Showing {visible.length} of {ALL_INTEGRATIONS.length} integrations
          {search && <> for "<strong>{search}</strong>"</>}
        </div>
      )}

      {/* Grid */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Store size={48} style={{ color: 'var(--c-border)', margin: '0 auto 16px', display: 'block' }} />
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No integrations found</div>
          <div style={{ fontSize: 13, color: 'var(--c-text3)' }}>Try a different category or search term.</div>
        </div>
      ) : (
        <div className="mkt-grid">
          {visible.map(item => {
            const isInstalled = installed.has(item.id)
            return (
              <div
                key={item.id}
                className="mkt-card"
                style={{ position: 'relative', outline: isInstalled ? '2px solid var(--c-primary)' : 'none' }}
                onClick={() => setSelected(item)}
              >
                {isInstalled && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'var(--c-primary)', color: 'white',
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 6,
                  }}>
                    ✓ Installed
                  </div>
                )}

                <div className="mkt-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="mkt-card-icon" style={{ background: item.color, color: 'white', fontWeight: 800, fontSize: 18 }}>
                      {typeof item.icon === 'string' ? item.icon : item.icon}
                    </div>
                    <div>
                      <div className="mkt-card-name">{item.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 2 }}>{item.cat}</div>
                    </div>
                  </div>
                  {!isInstalled && (
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700,
                      background: item.badge === 'Partner' ? 'var(--c-primary)' : 'var(--c-green-lt)',
                      color: item.badge === 'Partner' ? 'white' : 'var(--c-green)',
                    }}>{item.badge}</span>
                  )}
                </div>

                <div className="mkt-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <StarRating rating={item.rating} />
                    <span style={{ fontSize: 10, color: 'var(--c-text3)' }}>({item.reviews.toLocaleString()})</span>
                  </div>
                  <div className="mkt-card-desc">{item.desc}</div>
                  <div className="mkt-caps">
                    {item.tags.map(t => <div key={t} className="mkt-cap">{t}</div>)}
                  </div>
                </div>

                <div className="mkt-card-footer">
                  <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>by {item.author}</div>
                  <button
                    className={'btn btn-sm ' + (isInstalled ? 'btn-ghost' : 'btn-primary')}
                    style={{ padding: '5px 14px', fontSize: 11, gap: 5 }}
                    onClick={e => {
                      e.stopPropagation()
                      if (isInstalled) setSelected(item)
                      else { setSelected(item) }
                    }}
                  >
                    {isInstalled
                      ? <><Settings size={12} /> Manage</>
                      : <><Download size={12} /> Install</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <IntegrationDrawer
          item={selected}
          installed={installed.has(selected.id)}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
