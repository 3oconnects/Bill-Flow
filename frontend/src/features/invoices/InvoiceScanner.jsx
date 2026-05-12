import { useState } from 'react'
import { Scan, Upload, Search, X } from 'lucide-react'
import Modal from '@/components/Modal'

export default function InvoiceScanner({ onClose }) {
  const [search, setSearch] = useState('')

  return (
    <div className="scanner-modal">
      <div className="scanner-header" style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
        <div className="scanner-icon-wrap" style={{ width: 44, height: 44, background: 'var(--c-primary-lt)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-primary)', flexShrink: 0 }}>
          <Scan size={22} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>Invoice / QR Scanner</div>
          <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 2 }}>Scan or search for instant details</div>
        </div>
      </div>

      <div className="scanner-viewport" style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 12, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
          Camera Viewport Placeholder
        </div>
        <div className="scanner-guide" style={{ position: 'absolute', top: '20%', left: '20%', right: '20%', bottom: '20%', border: '2px dashed rgba(255,255,255,0.5)', borderRadius: 8 }}></div>
      </div>

      <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed', height: 48, marginBottom: 24 }}>
        <Upload size={16} /> Upload Invoice Receipt / QR Image
      </button>

      <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Or search by invoice # or customer</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <input className="form-input" placeholder="e.g. INV-0042 or customer name" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ padding: '0 24px' }}>Search</button>
        </div>
      </div>
    </div>
  )
}
