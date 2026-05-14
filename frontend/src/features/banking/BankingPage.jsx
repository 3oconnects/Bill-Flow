import { Landmark } from 'lucide-react'
export default function BankingPage() {
  return (
    <div>
      <div className="mkt-hero" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)' }}>
        <div className="mkt-hero-inner">
          <div className="mkt-hero-left">
            <div className="mkt-badge" style={{ background: 'rgba(255,255,255,0.2)' }}>Banking</div>
            <h1 className="mkt-hero-title">Banking & <span>Reconciliation</span></h1>
            <p className="mkt-hero-sub">Securely connect your bank accounts, reconcile transactions, and track NEFT/UPI payments in real-time.</p>
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <Landmark size={48} style={{ color: 'var(--c-green)', marginBottom: 16, margin: '0 auto' }} />
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Banking module coming soon</h3>
        <p style={{ color: 'var(--text-2)', maxWidth: 400, margin: '0 auto' }}>We are finalizing the security certifications for bank integrations. You'll be notified once it's live!</p>
      </div>
    </div>
  )
}
