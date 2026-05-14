import { Store, Search, ShieldCheck, Download, Zap, Box, Truck } from 'lucide-react'
import { useState } from 'react'

const INTEGRATIONS = [
  { id: 1, name: 'Razorpay Pro', author: 'Razorpay Software', cat: 'Payment Gateway', rating: '4.9 ★', desc: 'Enterprise-grade payment processing with deep BillFlow API integration for instant invoice reconciliation.', icon: '₹', color: 'linear-gradient(135deg, #072654, #1a6be8)', caps: ['Payments', 'Reconciliation'], excl: true },
  { id: 2, name: 'Stripe Global', author: 'Stripe Inc.', cat: 'Payment Gateway', rating: '4.8 ★', desc: 'Accept international payments seamlessly. Automatically converts currencies and syncs exchange rates.', icon: 'S', color: 'linear-gradient(135deg, #635bff, #00d4ff)', caps: ['Global', 'FX Sync'] },
  { id: 3, name: 'Delhivery Logistics', author: 'Delhivery', cat: 'Logistics Partner', rating: '4.7 ★', desc: 'Automate e-way bill generation and track shipments directly from your Goods Issue documents.', icon: <Truck size={24} color="white" />, color: 'linear-gradient(135deg, #ea4335, #ff7b00)', caps: ['E-Way Bill', 'Tracking'] },
  { id: 4, name: 'Zoho CRM Sync', author: 'BillFlow Connect', cat: 'CRM Integration', rating: '4.6 ★', desc: 'Two-way synchronization of Customer profiles, credit limits, and sales orders with Zoho CRM.', icon: <Box size={24} color="white" />, color: 'linear-gradient(135deg, #009688, #4db6ac)', caps: ['Sync', 'Customers'] },
  { id: 5, name: 'Tally ERP Exporter', author: 'BillFlow Connect', cat: 'Accounting', rating: '4.9 ★', desc: 'One-click export of journal entries, invoices, and receipts in Tally XML format for compliance.', icon: 'T', color: 'linear-gradient(135deg, #ffb300, #ff8f00)', caps: ['Export', 'Compliance'], excl: true },
  { id: 6, name: 'GST Suvidha', author: 'ClearTax', cat: 'Taxation API', rating: '4.8 ★', desc: 'Direct filing of GSTR-1 and GSTR-3B. Real-time validation of vendor GSTINs from the portal.', icon: <ShieldCheck size={24} color="white" />, color: 'linear-gradient(135deg, #3f51b5, #5c6bc0)', caps: ['Tax', 'Validation'] },
]

export default function MarketplacePage() {
  const [filter, setFilter] = useState('All')

  return (
    <div>
      <div className="mkt-hero">
        <div className="mkt-hero-bg"></div>
        <div className="mkt-hero-inner">
          <div className="mkt-hero-left">
            <div className="mkt-badge"><Zap size={12} /> App Store</div>
            <h1 className="mkt-hero-title">Vendor & API <span>Integrations</span></h1>
            <p className="mkt-hero-sub" style={{ color: 'rgba(255,255,255,0.7)' }}>Browse verified vendor APIs, payment gateways, and logistics partners to expand your business capabilities.</p>
            
            <div className="mkt-hero-search">
              <Search className="mkt-search-icon" />
              <input className="mkt-search-input" placeholder="Search for apps, payment gateways, or partners..." />
            </div>
          </div>
          <div className="mkt-stats">
            <div className="mkt-stat">
              <div className="mkt-stat-num">42</div>
              <div className="mkt-stat-label">Verified Apps</div>
            </div>
            <div className="mkt-stat-divider"></div>
            <div className="mkt-stat">
              <div className="mkt-stat-num mkt-stat-active">6</div>
              <div className="mkt-stat-label">Installed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mkt-filters">
        {['All', 'Payment Gateway', 'Logistics Partner', 'Accounting', 'Taxation API'].map(f => (
          <button key={f} className={`mkt-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="mkt-grid">
        {INTEGRATIONS.filter(i => filter === 'All' || i.cat === filter).map(item => (
          <div key={item.id} className="mkt-card">
            <div className="mkt-card-top">
              <div className="mkt-card-icon" style={{ background: item.color, color: 'white', fontWeight: 'bold' }}>
                {typeof item.icon === 'string' ? item.icon : item.icon}
              </div>
              <div>
                {item.excl ? <div className="mkt-badge-excl">Partner</div> : <div className="mkt-badge-active">Verified</div>}
              </div>
            </div>
            <div className="mkt-card-body">
              <div className="mkt-card-name-row">
                <div className="mkt-card-name">{item.name}</div>
                <div className="mkt-rating">{item.rating}</div>
              </div>
              <div className="mkt-card-desc">{item.desc}</div>
              <div className="mkt-caps">
                {item.caps.map(c => <div key={c} className="mkt-cap">{c}</div>)}
              </div>
            </div>
            <div className="mkt-card-footer">
              <div className="mkt-card-meta">
                <div className="mkt-card-cat">{item.cat}</div>
                <div className="mkt-card-author">by {item.author}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} /> Install
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
