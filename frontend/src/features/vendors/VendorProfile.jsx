import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit2, FileText, TrendingDown, Package, Upload, Trash2, Plus, ExternalLink } from 'lucide-react'
import { vendorsApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, Badge, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import VendorForm from './VendorForm'

function DocUploadModal({ vendorId, onSuccess, onCancel }) {
  const [name, setName] = useState('')
  const [docType, setDocType] = useState('other')
  const [fileUrl, setFileUrl] = useState('')
  const mutation = useMutation({
    mutationFn: () => vendorsApi.uploadDoc(vendorId, { name, doc_type: docType, file_url: fileUrl }),
    onSuccess: () => { toast.success('Document added'); onSuccess() },
    onError: (e) => toast.error(e.message),
  })
  return (
    <div>
      <div className="form-group">
        <label className="form-label">Document Name *</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GST Registration Certificate" />
      </div>
      <div className="form-group">
        <label className="form-label">Document Type</label>
        <select className="form-select" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {['gst','pan','aadhaar','agreement','invoice','other'].map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">File URL / Link</label>
        <input className="form-input" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://drive.google.com/..." />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={!name || !fileUrl || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? <Spinner size={14} /> : 'Add Document'}
        </button>
      </div>
    </div>
  )
}

export default function VendorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [docOpen, setDocOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const { data, isLoading } = useQuery({ queryKey: ['vendor', id], queryFn: () => vendorsApi.get(id) })
  const { data: products = [] } = useQuery({ queryKey: ['vendor-products', id], queryFn: () => vendorsApi.products(id) })
  const { data: expenses = [] } = useQuery({ queryKey: ['vendor-expenses', id], queryFn: () => vendorsApi.expenses(id) })

  const deleteDocMut = useMutation({
    mutationFn: (docId) => vendorsApi.deleteDoc(id, docId),
    onSuccess: () => { qc.invalidateQueries(['vendor', id]); toast.success('Document deleted') },
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) return <PageLoading />
  if (!data) return <div style={{ padding: 24, color: 'var(--text-2)' }}>Vendor not found.</div>

  const v = data
  const docs = v.documents || []
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalProducts = products.length

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="topbar-icon-btn" onClick={() => navigate('/vendors')}><ArrowLeft size={18} /></button>
            <div>
              <h1>{v.name}</h1>
              <p>{v.company_name || 'Vendor Profile'} · {v.city || v.state || 'Location not set'}</p>
            </div>
          </div>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Badge status={v.status} />
          <button className="btn btn-secondary" onClick={() => setEditOpen(true)}><Edit2 size={14} /> Edit Vendor</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="kpi-card red">
          <div className="kpi-label">Total Purchases</div>
          <div className="kpi-value">{fmt.currency(totalExpenses)}</div>
          <div className="kpi-sub">{expenses.length} expense entries</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-label">Products Supplied</div>
          <div className="kpi-value">{totalProducts}</div>
          <div className="kpi-sub">linked products</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Documents</div>
          <div className="kpi-value">{docs.length}</div>
          <div className="kpi-sub">verified uploads</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Essential Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: 20, borderBottom: '1px solid var(--c-border)', marginBottom: 16 }}>
                <div className="vendor-avatar-lg">
                  {fmt.initials(v.name)}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{v.name}</div>
                {v.company_name && <div style={{ fontSize: 12, color: 'var(--c-text3)', fontWeight: 500, marginTop: 2 }}>{v.company_name}</div>}
              </div>

              <div className="section-title">Primary Contact</div>
              {[
                ['Contact', v.contact_person], ['Email', v.email], ['Phone', v.phone],
              ].filter(([, val]) => val).map(([label, val]) => (
                <div key={label} className="vendor-meta-row">
                  <span className="vendor-meta-label">{label}</span>
                  <span className="vendor-meta-value">{val}</span>
                </div>
              ))}

              <div className="section-title" style={{ marginTop: 20 }}>Tax & Identity</div>
              {[
                ['GSTIN', v.gstin], ['PAN', v.pan],
              ].filter(([, val]) => val).map(([label, val]) => (
                <div key={label} className="vendor-meta-row">
                  <span className="vendor-meta-label">{label}</span>
                  <span className="vendor-meta-value mono" style={{ color: 'var(--c-primary)', fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="section-title">Banking Details</div>
              {[
                ['Bank', v.bank_name], ['Account', v.bank_account], ['IFSC', v.ifsc],
              ].filter(([, val]) => val).map(([label, val]) => (
                <div key={label} className="vendor-meta-row">
                  <span className="vendor-meta-label">{label}</span>
                  <span className="vendor-meta-value" style={{ fontWeight: label === 'Bank' ? 600 : 400 }}>{val}</span>
                </div>
              ))}
              {!v.bank_account && <div style={{ fontSize: 12, color: 'var(--c-text3)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>No banking info provided</div>}
            </div>
          </div>
        </div>

        {/* Right Tabs */}
        <div>
          <div className="tabs">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'products', label: `Products (${products.length})` },
              { id: 'expenses', label: `Purchases (${expenses.length})` },
              { id: 'documents', label: `Documents (${docs.length})` },
            ].map((t) => (
              <button key={t.id} className={`tab-btn${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
            ))}
          </div>

          <div className="card">
            {/* Overview */}
            {activeTab === 'overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>Total Purchases</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>{fmt.currency(totalExpenses)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>{expenses.length} expense entries</div>
                  </div>
                  <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>Products Supplied</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{totalProducts}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>linked products</div>
                  </div>
                </div>
                {expenses.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Recent Purchases</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>{['Description','Date','Amount','Category'].map((h) => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {expenses.slice(0, 5).map((e) => (
                          <tr key={e.id}>
                            <td style={{ padding: '10px 12px', fontWeight: 500 }}>{e.description}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-2)', fontSize: 12 }}>{fmt.date(e.date)}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>{fmt.currency(e.amount)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-2)', textTransform: 'capitalize', fontSize: 12 }}>{e.category?.replace('_', ' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}

            {/* Products */}
            {activeTab === 'products' && (
              products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No products linked to this vendor</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Product','SKU','Supply Price','Stock','Category'].map((h) => <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }} onClick={() => navigate(`/products/${p.id}`)}>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)' }}>{p.sku || '—'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>{fmt.currency(p.supply_price || p.purchase_price)}</td>
                        <td style={{ padding: '12px 14px', color: Number(p.stock_qty) <= Number(p.low_stock_alert) ? 'var(--red)' : 'var(--text)' }}>
                          {fmt.number(p.stock_qty)} {p.unit}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-2)', textTransform: 'capitalize' }}>{p.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* Expenses / Purchases */}
            {activeTab === 'expenses' && (
              expenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No purchase history</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Description','Date','Category','Amount','GST'].map((h) => <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 500 }}>{e.description}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-2)', fontSize: 12 }}>{fmt.date(e.date)}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-2)', textTransform: 'capitalize', fontSize: 12 }}>{e.category?.replace('_', ' ')}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{fmt.currency(e.amount)}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-2)' }}>{e.gst_rate}%</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-2)' }}>Total</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--red)' }}>{fmt.currency(totalExpenses)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              )
            )}

            {/* Documents */}
            {activeTab === 'documents' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button className="btn btn-primary" onClick={() => setDocOpen(true)}>
                    <Upload size={14} /> Add Document
                  </button>
                </div>
                {docs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No documents uploaded yet</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 12 }}>
                    {docs.map((doc) => (
                      <div key={doc.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{doc.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, textTransform: 'uppercase' }}>{doc.doc_type}</div>
                          </div>
                          <button style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }} onClick={() => window.confirm('Delete document?') && deleteDocMut.mutate(doc.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                            <ExternalLink size={12} /> View Document
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <Modal title="Edit Vendor" onClose={() => setEditOpen(false)} size="lg">
          <VendorForm initial={v} onSuccess={() => { setEditOpen(false); qc.invalidateQueries(['vendor', id]); toast.success('Vendor updated') }} onCancel={() => setEditOpen(false)} />
        </Modal>
      )}
      {docOpen && (
        <Modal title="Add Document" onClose={() => setDocOpen(false)}>
          <DocUploadModal vendorId={id} onSuccess={() => { setDocOpen(false); qc.invalidateQueries(['vendor', id]) }} onCancel={() => setDocOpen(false)} />
        </Modal>
      )}
    </div>
  )
}
