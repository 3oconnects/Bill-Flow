import { useState } from 'react'
import { X, CheckCircle2, Star, Zap, Settings, Download, Trash2, RefreshCw } from 'lucide-react'

export function StarRating({ rating }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#f59e0b' }}>
      <Star size={11} fill="#f59e0b" stroke="none" />
      {rating.toFixed(1)}
    </span>
  )
}

export function IntegrationDrawer({ item, installed, onInstall, onUninstall, onClose }) {
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
