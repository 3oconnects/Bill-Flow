import { Store } from 'lucide-react'
export default function MarketplacePage() {
  return (
    <div>
      <div className="mkt-hero">
        <div className="mkt-hero-inner">
          <div className="mkt-hero-left">
            <div className="mkt-badge">Marketplace</div>
            <h1 className="mkt-hero-title">Vendor & API <span>Integrations</span></h1>
            <p className="mkt-hero-sub">Browse verified vendor APIs, payment gateways, and logistics partners to expand your business capabilities.</p>
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <Store size={48} style={{ color: 'var(--c-blue)', marginBottom: 16, margin: '0 auto' }} />
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Integrations coming soon</h3>
        <p style={{ color: 'var(--text-2)', maxWidth: 400, margin: '0 auto' }}>We are working with partners to bring you the best integrations. Stay tuned!</p>
      </div>
    </div>
  )
}
