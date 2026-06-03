import { useState, useEffect } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { Search, Plus, Settings, Trash2 } from 'lucide-react'
import { ALL_INTEGRATIONS } from '@/features/marketplace/marketplaceData'

export default function IntegrationsPage() {
  const { setContext, setActions, clear } = useTopbarStore()
  const [installed, setInstalled] = useState(new Set([1, 5])) // Razorpay & Tally
  const [search, setSearch] = useState('')

  useEffect(() => {
    setContext('Administration', 'Integrations')
    setActions(
      <button className="btn btn-primary" onClick={() => window.location.href = '/marketplace'}>
        <Plus size={15} /> Browse Integrations
      </button>
    )
    return clear
  }, [setContext, setActions, clear])

  const installedItems = ALL_INTEGRATIONS.filter(i => installed.has(i.id))
  const availableCount = ALL_INTEGRATIONS.length

  const filtered = installedItems.filter(item => {
    const q = search.toLowerCase()
    return !q || item.name.toLowerCase().includes(q) || item.cat.toLowerCase().includes(q)
  })

  const handleUninstall = (id) => {
    setInstalled(p => { const n = new Set(p); n.delete(id); return n })
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Integrations</h1>
          <p>Manage connections to payment gateways, accounting tools, logistics, and other business services.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, maxWidth: 600 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Installed</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--c-text)' }}>{installed.size}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>active integrations</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Available</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--c-text)' }}>{availableCount}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>integrations in marketplace</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 360 }}>
          <Search className="search-icon" size={16} />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search integrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--c-text2)' }}>
            {search ? 'No integrations found' : 'No installed integrations'}
          </div>
          <p style={{ color: 'var(--c-text3)', maxWidth: 400, margin: '0 auto', fontSize: 13 }}>
            {search ? 'Try a different search term.' : 'Browse marketplace to add integrations.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(item => (
            <div
              key={item.id}
              className="card"
              style={{
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s',
                cursor: 'pointer',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {/* Connected Badge */}
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'var(--c-success)',
                color: 'white',
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '3px 8px',
                borderRadius: 4
              }}>
                ✓ Connected
              </div>

              {/* Icon + Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: typeof item.color === 'string' ? item.color : 'var(--c-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                  flexShrink: 0
                }}>
                  {typeof item.icon === 'string' ? item.icon : item.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--c-text3)', marginTop: 2 }}>{item.cat}</div>
                </div>
              </div>

              {/* Rating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 1 }}>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{
                      color: i < Math.floor(item.rating) ? 'var(--c-warning)' : 'var(--c-border)',
                      fontSize: 12
                    }}>★</span>
                  ))}
                </div>
                <span style={{ fontSize: 10, color: 'var(--c-text3)' }}>({item.reviews.toLocaleString()})</span>
              </div>

              {/* Description */}
              <p style={{ fontSize: 12, color: 'var(--c-text2)', lineHeight: 1.5, marginBottom: 12, flex: 1 }}>
                {item.desc}
              </p>

              {/* Tags */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {item.tags.slice(0, 2).map(tag => (
                  <span key={tag} style={{
                    fontSize: 10,
                    fontWeight: 500,
                    background: 'var(--c-surface2)',
                    color: 'var(--c-text3)',
                    padding: '3px 8px',
                    borderRadius: 4
                  }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* Badge + Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--c-border)', paddingTop: 12 }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: item.badge === 'Partner' ? 'var(--c-primary)' : 'var(--c-green)',
                  background: item.badge === 'Partner' ? 'var(--c-primary-lt)' : 'var(--c-green-lt)',
                  padding: '3px 8px',
                  borderRadius: 4
                }}>
                  {item.badge}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => alert(`Configure ${item.name}`)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 5,
                      border: 'none',
                      background: 'var(--c-surface2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--c-text3)',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--c-primary)'
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--c-surface2)'
                      e.currentTarget.style.color = 'var(--c-text3)'
                    }}
                    title="Settings"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={() => handleUninstall(item.id)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 5,
                      border: 'none',
                      background: 'var(--c-surface2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--c-text3)',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--c-red-lt)'
                      e.currentTarget.style.color = 'var(--c-red)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--c-surface2)'
                      e.currentTarget.style.color = 'var(--c-text3)'
                    }}
                    title="Uninstall"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
