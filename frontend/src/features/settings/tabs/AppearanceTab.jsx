import { useState } from 'react'
import { useTheme } from '@/store/themeStore'
import { toast } from '@/store/toastStore'

export default function AppearanceTab() {
  const { isDark, setMode, mode } = useTheme()
  const [compact, setCompact] = useState(localStorage.getItem('bf_compact') === 'true')

  const applyTheme = (t) => {
    if (t === 'light') setMode('light')
    else if (t === 'dark') setMode('dark')
    else setMode('system')
    toast.success(`${t.charAt(0).toUpperCase() + t.slice(1)} mode applied`)
  }

  // Map mode to selected card id
  const selectedId = mode === 'light' ? 'light' : mode === 'dark' ? 'dark' : 'system'

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Color Theme</div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        {[
          { id: 'dark', label: 'Dark Mode', preview: 'linear-gradient(135deg,#0f1117,#1a1d27)' },
          { id: 'light', label: 'Light Mode', preview: 'linear-gradient(135deg,#f4f5f7,#ffffff)' },
          { id: 'system', label: 'System', preview: 'linear-gradient(135deg,#e2e8f0,#94a3b8)' },
        ].map((t) => (
          <div key={t.id} onClick={() => applyTheme(t.id)} style={{
            cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
            border: `2px solid ${selectedId === t.id ? 'var(--c-primary)' : 'var(--c-border)'}`,
            transition: '0.2s',
          }}>
            <div style={{ width: 120, height: 72, background: t.preview }} />
            <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, textAlign: 'center', color: selectedId === t.id ? 'var(--c-primary)' : 'var(--c-text2)' }}>
              {t.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Display Density</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--c-surface2)', borderRadius: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Compact Mode</div>
          <div style={{ fontSize: 12, color: 'var(--c-text3)' }}>Reduce padding and spacing for denser information display</div>
        </div>
        <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
          <input type="checkbox" checked={compact} onChange={(e) => {
            setCompact(e.target.checked)
            localStorage.setItem('bf_compact', e.target.checked)
            document.body.classList.toggle('compact', e.target.checked)
          }} style={{ opacity: 0, width: 0, height: 0 }} />
          <span style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12,
            background: compact ? 'var(--c-primary)' : 'var(--c-border)', transition: '0.2s',
          }}>
            <span style={{ position: 'absolute', top: 2, left: compact ? 22 : 2, width: 20, height: 20, background: 'white', borderRadius: '50%', transition: '0.2s' }} />
          </span>
        </label>
      </div>

      <div style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Localization</div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Language</label>
          <select className="form-select" defaultValue={localStorage.getItem('bf_lang') || 'en'}
            onChange={(e) => { localStorage.setItem('bf_lang', e.target.value); toast.success('Language saved') }}>
            <option value="en">English</option>
            <option value="hi">Hindi (हिंदी)</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Date Format</label>
          <select className="form-select" defaultValue={localStorage.getItem('bf_date_fmt') || 'dd/mm/yyyy'}
            onChange={(e) => { localStorage.setItem('bf_date_fmt', e.target.value); toast.success('Format saved') }}>
            <option value="dd/mm/yyyy">DD/MM/YYYY</option>
            <option value="mm/dd/yyyy">MM/DD/YYYY</option>
            <option value="yyyy-mm-dd">YYYY-MM-DD</option>
          </select>
        </div>
      </div>
    </div>
  )
}
