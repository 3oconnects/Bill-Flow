import { useState, useEffect } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { Store, Search, Zap, CheckCircle2, Settings, Download } from 'lucide-react'
import { ALL_INTEGRATIONS, CATEGORIES } from './marketplaceData'
import { IntegrationDrawer, StarRating } from './IntegrationDrawer'

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
