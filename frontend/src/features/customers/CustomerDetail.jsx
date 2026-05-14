import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Edit2, FileText, CreditCard, Shield, Plus, CheckCircle2, UserPlus, Users,
  Phone, Mail, MapPin, Building2, Hash, Banknote, TrendingUp, Clock, AlertCircle,
  MoreVertical, Download, Send, Trash2, History, Package, DollarSign, User, Settings
} from 'lucide-react'
import { customersApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, EmptyState, Badge } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import CustomerForm from './CustomerForm'

function StatCard({ label, value, icon: Icon, color, trend }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>{value}</div>
          {trend && <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>{trend}</div>}
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value, icon: Icon }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {Icon && <Icon size={14} style={{ color: 'var(--text-3)', marginTop: 2 }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('invoices')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-detail', id],
    queryFn: () => customersApi.detail(id),
  })

  const deleteMut = useMutation({
    mutationFn: () => customersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(['customers'])
      toast.success('Customer deleted successfully')
      navigate('/customers')
    },
    onError: (e) => toast.error(e.message)
  })

  if (isLoading) return <PageLoading />
  if (!data) return <div style={{ padding: 48, textAlign: 'center' }}><EmptyState title="Customer not found" icon={<Users size={48} />} /></div>

  const { customer: c, invoices = [], payments = [], warranty_claims = [] } = data

  const totalPurchases = invoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const paidAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const outstanding = Number(c.outstanding || 0)
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${c.name}"? This will move the customer to the recycle bin.`)) {
      deleteMut.mutate()
    }
  }

  const handleExport = (type) => {
    toast.success(`Exporting as ${type}...`)
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="topbar-icon-btn" onClick={() => navigate('/customers')} title="Back">
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>{c.name}</h1>
            <Badge status={c.status} label={c.status?.toUpperCase()} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace' }}>{c.customer_id_display || 'CUST-0000'}</span>
            <span>·</span>
            <span>Customer since {fmt.date(c.created_at)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="dropdown">
            <button className="btn btn-ghost"><Download size={14} /> Export</button>
            <div className="dropdown-content">
              <button onClick={() => handleExport('PDF')}>PDF Document</button>
              <button onClick={() => handleExport('Excel')}>Excel Spreadsheet</button>
              <button onClick={() => handleExport('CSV')}>CSV File</button>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => toast.success('Reminder sent!')}><Send size={14} /> Send Reminder</button>
          <button className="btn btn-ghost" onClick={() => setEditOpen(true)}><Edit2 size={14} /> Edit</button>
          <button className="btn btn-primary" onClick={() => navigate(`/invoices/new?customer_id=${c.id}&customer_name=${encodeURIComponent(c.name)}`)}>
            <Plus size={14} /> Create Invoice
          </button>
          <button className="topbar-icon-btn" style={{ color: 'var(--red)' }} onClick={handleDelete} title="Delete"><Trash2 size={16} /></button>
        </div>
      </div>

      {/* Financial Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Purchases" value={fmt.currency(totalPurchases)} icon={Package} color="var(--accent)" trend="+5% this month" />
        <StatCard label="Paid Amount" value={fmt.currency(paidAmount)} icon={CheckCircle2} color="var(--green)" />
        <StatCard label="Outstanding" value={fmt.currency(outstanding)} icon={Clock} color="var(--yellow)" />
        <StatCard label="Overdue Invoices" value={overdueCount} icon={AlertCircle} color="var(--red)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24 }}>
        {/* Left Sidebar: Profile Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--c-border)' }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 32, fontWeight: 700, marginBottom: 16, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                {fmt.initials(c.name)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{c.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{c.company_name || 'Individual Customer'}</div>
            </div>

            <InfoBlock title="Contact Information">
              <InfoRow label="Email Address" value={c.email} icon={Mail} />
              <InfoRow label="Phone Number" value={c.phone} icon={Phone} />
              <InfoRow label="Alternate Phone" value={c.alternate_phone} icon={Phone} />
              <InfoRow label="Contact Person" value={c.contact_person} icon={User} />
            </InfoBlock>

            <InfoBlock title="Business Details">
              <InfoRow label="GSTIN" value={c.gstin} icon={Hash} />
              <InfoRow label="PAN Number" value={c.pan} icon={Hash} />
              <InfoRow label="Business Type" value={c.business_type} icon={Building2} />
              <InfoRow label="Category" value={c.customer_category} icon={Settings} />
            </InfoBlock>

            <InfoBlock title="Billing Address">
              <div style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-2)' }}>
                <MapPin size={14} style={{ flexShrink: 0, marginTop: 3, color: 'var(--text-3)' }} />
                <span>
                  {c.address}<br />
                  {c.shipping_address_line2 && <>{c.shipping_address_line2}<br /></>}
                  {c.city}, {c.state} - {c.pincode}<br />
                  {c.country}
                </span>
              </div>
            </InfoBlock>

            {c.notes && (
              <div style={{ marginTop: 8, padding: 16, background: 'var(--bg-2)', borderRadius: 12, borderLeft: '4px solid var(--accent)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>Internal Notes</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{c.notes}</div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <InfoBlock title="Financial Preferences">
              <InfoRow label="Currency" value={c.currency} icon={DollarSign} />
              <InfoRow label="Payment Terms" value={c.payment_terms} icon={Clock} />
              <InfoRow label="Tax Preference" value={c.tax_preference} icon={Shield} />
              <InfoRow label="Credit Limit" value={c.credit_limit > 0 ? fmt.currency(c.credit_limit) : 'No Limit'} icon={TrendingUp} />
            </InfoBlock>
          </div>
        </div>

        {/* Right Content: Tabs and Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Tabs Navigation */}
          <div className="tabs" style={{ marginBottom: 0 }}>
            {[
              { id: 'invoices', label: `Invoices (${invoices.length})`, icon: FileText },
              { id: 'payments', label: `Payments (${payments.length})`, icon: Banknote },
              { id: 'warranty', label: `Warranty Claims (${warranty_claims.length})`, icon: Shield },
              { id: 'timeline', label: 'Activity Timeline', icon: History },
            ].map((t) => (
              <button key={t.id} className={`tab-btn${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="card" style={{ padding: 0 }}>
            {activeTab === 'invoices' && (
              <div className="table-wrap">
                {invoices.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center' }}><EmptyState title="No invoices yet" icon={<FileText size={48} />} /></div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Invoice #</th><th>Date</th><th>Due Date</th><th>Amount</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{inv.number}</td>
                          <td>{fmt.date(inv.date)}</td>
                          <td>{fmt.date(inv.due_date)}</td>
                          <td style={{ fontWeight: 700 }}>{fmt.currency(inv.total)}</td>
                          <td><Badge status={inv.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="table-wrap">
                {payments.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center' }}><EmptyState title="No payments received" icon={<Banknote size={48} />} /></div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Invoice</th></tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td>{fmt.date(p.date)}</td>
                          <td style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt.currency(p.amount)}</td>
                          <td><span style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>{p.method?.replace('_', ' ')}</span></td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.reference || '—'}</td>
                          <td>{invoices.find(i => i.id === p.invoice_id)?.number || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'warranty' && (
              <div className="table-wrap">
                {warranty_claims.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center' }}><EmptyState title="No warranty claims" icon={<Shield size={48} />} /></div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Product</th><th>Model</th><th>Issue</th><th>Date</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {warranty_claims.map((w) => (
                        <tr key={w.id}>
                          <td style={{ fontWeight: 500 }}>{w.product_name}</td>
                          <td>{w.model_number}</td>
                          <td style={{ maxWidth: 200, fontSize: 12 }}>{w.issue_description}</td>
                          <td>{fmt.date(w.created_at)}</td>
                          <td><Badge status={w.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (() => {
              const timeline = [
                { title: 'Customer Record Created', date: c.created_at, icon: UserPlus, color: 'var(--accent)' },
                ...invoices.map(i => ({ title: `Invoice ${i.number} Generated`, date: i.created_at, icon: FileText, color: 'var(--blue)' })),
                ...payments.map(p => ({ title: `Payment Received (${fmt.currency(p.amount)})`, date: p.created_at, icon: CheckCircle2, color: 'var(--green)' })),
                ...(c.updated_at !== c.created_at ? [{ title: 'Profile Details Updated', date: c.updated_at, icon: Edit2, color: 'var(--orange)' }] : [])
              ].sort((a, b) => new Date(b.date) - new Date(a.date));

              return (
                <div style={{ padding: 32 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {timeline.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ 
                            width: 36, height: 36, borderRadius: '50%', 
                            background: `${item.color}15`, display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', 
                            color: item.color, border: `2px solid ${item.color}30`,
                            zIndex: 1 
                          }}>
                            <item.icon size={16} />
                          </div>
                          {idx !== timeline.length - 1 && (
                            <div style={{ width: 2, flex: 1, background: 'var(--c-border)', margin: '4px 0' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, paddingBottom: 32 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, fontWeight: 500 }}>
                            {fmt.date(item.date)} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {item.notes && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-2)', background: 'var(--bg-2)', padding: '8px 12px', borderRadius: 8 }}>{item.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <Modal title="Edit Customer" onClose={() => setEditOpen(false)} size="lg">
          <CustomerForm
            initial={c}
            onSuccess={() => { setEditOpen(false); qc.invalidateQueries(['customer-detail', id]); toast.success('Customer updated') }}
            onCancel={() => setEditOpen(false)}
          />
        </Modal>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .dropdown { position: relative; display: inline-block; }
        .dropdown-content {
          display: none; position: absolute; right: 0; background-color: white; min-width: 160px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-radius: 8px; z-index: 100; border: 1px solid var(--c-border);
          overflow: hidden;
        }
        .dropdown:hover .dropdown-content { display: block; }
        .dropdown-content button {
          width: 100%; padding: 10px 16px; text-align: left; border: none; background: none; font-size: 13px; cursor: pointer;
        }
        .dropdown-content button:hover { background-color: var(--bg-2); color: var(--accent); }
      `}} />
    </div>
  )
}
