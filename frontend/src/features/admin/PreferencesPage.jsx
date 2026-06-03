import { useEffect } from 'react'
import { useTopbarStore } from '@/store/topbarStore'
import { SlidersHorizontal } from 'lucide-react'

export default function PreferencesPage() {
  const { setContext, clear } = useTopbarStore()
  useEffect(() => { setContext('Administration', 'Preferences'); return clear }, [])

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Preferences</h1>
          <p>App-wide settings, number formats, date formats and display options.</p>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
        <SlidersHorizontal
          size={52}
          style={{ color: 'var(--c-primary)', margin: '0 auto 18px', display: 'block', opacity: 0.35 }}
        />
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Preferences
        </h3>
        <p style={{ color: 'var(--c-text2)', maxWidth: 420, margin: '0 auto 20px', fontSize: 13, lineHeight: 1.6 }}>
          App-wide settings, number formats, date formats and display options.
        </p>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--c-primary-lt)', color: 'var(--c-primary)',
          border: '1px solid rgba(26,107,232,.2)',
          padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700,
        }}>
          🚧 Coming in next release
        </span>
      </div>
    </div>
  )
}
