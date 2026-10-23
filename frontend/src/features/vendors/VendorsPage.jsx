import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Eye, Edit2, Trash2, ShoppingBag,
  Users, Wallet, AlertTriangle, Filter, X,
  Download, Upload, MoreVertical, CheckSquare,
  Square, UserCheck, UserX, RefreshCw, FileText,
  ChevronDown, TrendingUp, Activity,
} from 'lucide-react'
import { vendorsApi, apApi } from '@/api'
import { fmt } from '@/lib/utils'
import { PageLoading, EmptyState, Badge, Spinner } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import VendorForm from './VendorForm'
import { confirmAction } from '@/store/confirmStore'

// ── Skeleton loader ────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div style={{ padding: '0 0 8px' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '40px 100px 1fr 1fr 1fr 1fr 100px 110px 100px',
          gap: 12, padding: '14px 16px',
          borderBottom: '1px solid var(--c-border)', alignItems: 'center',
        }}>
          {[...Array(9)].map((__, j) => (
            <div key={j} style={{
              height: 12, borderRadius: 6,
              background: 'var(--c-border)', opacity: 0.6 + i * 0.05,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Summary KPI Card ───────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color = 'blue', loading }) {
  const colors = {
    blue:   { bg: 'var(--c-primary-lt)',  fg: 'var(--c-primary)' },
    green:  { bg: 'var(--c-green-lt)',    fg: 'var(--c-green)' },
    red:    { bg: 'var(--c-red-lt)',      fg: 'var(--c-red)' },
    orange: { bg: 'var(--c-orange-lt)',   fg: 'var(--c-orange)' },
    purple: { bg: 'var(--c-purple-lt)',   fg: 'var(--c-purple)' },
    gray:   { bg: 'var(--c-surface2)',    fg: 'var(--c-text2)' },
  }
  const c = colors[color] || colors.blue
  return (
    <div style={{
      background: 'var(--c-surface)', border: '1px solid var(--c-border)',
      borderRadius: 10, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: c.bg, color: c.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>{label}</div>
        {loading
          ? <div style={{ height: 22, width: 60, background: 'var(--c-border)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
          : <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1 }}>{value}</div>
        }
        {sub && <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Actions dropdown ───────────────────────────────────────────────────
function ActionsMenu({ vendor, onEdit, onDelete, onDeactivate, navigate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const close = () => setOpen(false)

  const items = [
    { label: 'View Profile',       icon: Eye,      action: () => { navigate(`/vendors/${vendor.id}`); close() } },
    { label: 'Edit Vendor',        icon: Edit2,     action: () => { onEdit(vendor); close() } },
    { label: 'New Bill (AP)',       icon: FileText,  action: () => { navigate(`/ap?type=invoices&vendor_id=${vendor.id}&new=1`); close() } },
    { label: 'New Purchase Order', icon: ShoppingBag, action: () => { navigate(`/purchases?vendor_id=${vendor.id}&new=1`); close() } },
    { sep: true },
    vendor.status === 'active'
      ? { label: 'Deactivate',     icon: UserX,    action: () => { onDeactivate(vendor, 'inactive'); close() }, danger: false, muted: true }
      : { label: 'Activate',       icon: UserCheck, action: () => { onDeactivate(vendor, 'active'); close() }, success: true },
    { label: 'Delete',             icon: Trash2,   action: () => { onDelete(vendor); close() }, danger: true },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-sm btn-icon"
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        title="Actions"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={close} />
          <div style={{
            position: 'absolute', right: 0, top: '100%', zIndex: 50,
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            borderRadius: 8, boxShadow: 'var(--shadow-lg)',
            minWidth: 190, padding: '4px 0', marginTop: 4,
          }}>
            {items.map((item, i) =>
              item.sep ? (
                <div key={i} style={{ borderTop: '1px solid var(--c-border)', margin: '4px 0' }} />
              ) : (
                <button key={i} onClick={item.action} style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500,
                  color: item.danger ? 'var(--c-red)' : item.success ? 'var(--c-green)' : item.muted ? 'var(--c-text2)' : 'var(--c-text)',
                }}>
                  <item.icon size={14} />
                  {item.label}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Import Modal placeholder ───────────────────────────────────────────
function ImportModal({ onClose }) {
  const [file, setFile] = useState(null)
  const [step, setStep] = useState('upload') // upload | preview

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--c-text2)', lineHeight: 1.6 }}>
        Upload a CSV or Excel file with vendor data. Required columns: <strong>name</strong>.
        Optional: company_name, email, phone, gstin, city, state, country, status.
      </div>
      {step === 'upload' ? (
        <div style={{
          border: '2px dashed var(--c-border2)', borderRadius: 10, padding: '36px 24px',
          textAlign: 'center', color: 'var(--c-text3)', cursor: 'pointer',
        }}
          onClick={() => document.getElementById('vendor-import-file').click()}
        >
          <Upload size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Click to select file</div>
          <div style={{ fontSize: 12 }}>Supports .csv, .xlsx</div>
          <input id="vendor-import-file" type="file" accept=".csv,.xlsx" hidden
            onChange={e => { setFile(e.target.files[0]); if (e.target.files[0]) setStep('preview') }}
          />
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <FileText size={16} style={{ color: 'var(--c-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>{file?.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setStep('upload') }}>
              <X size={12} /> Remove
            </button>
          </div>
          <div style={{
            background: 'var(--c-orange-lt)', border: '1px solid var(--c-orange)',
            borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--c-orange)',
          }}>
            CSV/Excel import requires a backend file-processing endpoint. Please ensure your file follows the template format.
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!file} onClick={() => { toast.info('Import feature: connect your backend processor'); onClose() }}>
          Import Vendors
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function VendorsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  // State
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [formOpen, setFormOpen]     = useState(false)
  const [editing, setEditing]       = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [selected, setSelected]     = useState(new Set())

  // Data
  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })
  const { data: apInvoices = [] } = useQuery({
    queryKey: ['ap', 'invoices'],
    queryFn: () => apApi.list('invoices'),
  })

  // ── KPIs ─────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const active   = vendors.filter(v => v.status === 'active').length
    const inactive = vendors.filter(v => v.status !== 'active').length
    const now      = Date.now()

    const openInvoices = apInvoices.filter(i => !['paid', 'cancelled', 'closed'].includes(i.status))
    const totalPayables = openInvoices.reduce(
      (s, i) => s + Math.max(0, Number(i.total_amount || 0) - Number(i.paid_amount || 0)), 0
    )
    const overdueVal = openInvoices
      .filter(i => i.due_date && new Date(i.due_date).getTime() < now)
      .reduce((s, i) => s + Math.max(0, Number(i.total_amount || 0) - Number(i.paid_amount || 0)), 0)

    return { total: vendors.length, active, inactive, totalPayables, overdueVal }
  }, [vendors, apInvoices])

  // ── Mutations ─────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: vendorsApi.remove,
    onSuccess: (res) => {
      qc.invalidateQueries(['vendors'])
      toast.success(res?.deactivated ? 'Vendor deactivated (has transactions)' : 'Vendor deleted')
    },
    onError: e => toast.error(e.message),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => vendorsApi.updateStatus(id, status),
    onSuccess: (_, { status }) => { qc.invalidateQueries(['vendors']); toast.success(`Vendor ${status === 'active' ? 'activated' : 'deactivated'}`) },
    onError: e => toast.error(e.message),
  })

  // ── Filter logic ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = vendors
    if (statusFilter !== 'all') list = list.filter(v => v.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.name?.toLowerCase().includes(q) ||
        v.company_name?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.phone?.includes(q) ||
        v.gstin?.toLowerCase().includes(q) ||
        v.vendor_id?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q)
      )
    }
    return list
  }, [vendors, search, statusFilter])

  // ── Selection helpers ──────────────────────────────────────────────────
  const allSelected = filtered.length > 0 && filtered.every(v => selected.has(v.id))
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(filtered.map(v => v.id)))
  const toggleOne   = (id) => setSelected(prev => {
    const s = new Set(prev)
    s.has(id) ? s.delete(id) : s.add(id)
    return s
  })

  // Bulk actions
  const handleBulkActivate   = () => {
    confirmAction(`Activate ${selected.size} vendors?`, async () => {
      for (const id of selected) await statusMut.mutateAsync({ id, status: 'active' }).catch(() => {})
      setSelected(new Set()); toast.success('Done')
    })
  }
  const handleBulkDeactivate = () => {
    confirmAction(`Deactivate ${selected.size} vendors?`, async () => {
      for (const id of selected) await statusMut.mutateAsync({ id, status: 'inactive' }).catch(() => {})
      setSelected(new Set()); toast.success('Done')
    })
  }

  // Export CSV
  const handleExport = () => {
    const rows = [
      ['ID', 'Name', 'Company', 'Contact', 'Email', 'Phone', 'GSTIN', 'City', 'State', 'Status'],
      ...filtered.map(v => [
        v.id, v.name, v.company_name, v.contact_person, v.email, v.phone, v.gstin, v.city, v.state, v.status,
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `vendors-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('Exported!')
  }

  const handleDelete = (v) => {
    confirmAction(
      `Delete "${v.name}"? If this vendor has AP transactions, they will be preserved and the vendor will be deactivated instead.`,
      () => deleteMut.mutate(v.id)
    )
  }

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Vendors</h1>
          <p>{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} in your supplier book</p>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setImportOpen(true)}>
            <Upload size={14} /> Import
          </button>
          <button className="btn btn-ghost" onClick={handleExport}>
            <Download size={14} /> Export
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={15} /> New Vendor
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Total Vendors"    value={kpis.total}                     icon={Users}         color="blue"   loading={isLoading} />
        <KpiCard label="Active Vendors"   value={kpis.active}                    icon={UserCheck}     color="green"  loading={isLoading} />
        <KpiCard label="Inactive Vendors" value={kpis.inactive}                  icon={UserX}         color="gray"   loading={isLoading} />
        <KpiCard label="Total Payables"   value={fmt.currency(kpis.totalPayables)} sub="Outstanding" icon={Wallet}  color="orange" loading={isLoading} />
        <KpiCard label="Overdue Payables" value={fmt.currency(kpis.overdueVal)}  sub="Past due date"  icon={AlertTriangle} color="red" loading={isLoading} />
      </div>

      {/* ── Main Card ── */}
      <div className="card">
        {/* Toolbar */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--c-border)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text3)', pointerEvents: 'none' }} />
            <input
              className="form-input"
              placeholder="Search by name, email, phone, GSTIN…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, paddingRight: search ? 30 : 12 }}
            />
            {search && (
              <button style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', padding: 0 }}
                onClick={() => setSearch('')}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div style={{ position: 'relative' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={e => setStatus(e.target.value)}
              style={{ paddingRight: 28 }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          {/* Filter toggle */}
          <button
            className={`btn btn-ghost${showFilters ? ' btn-secondary' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter size={14} /> Filters
          </button>

          {/* Clear filters */}
          {(search || statusFilter !== 'all') && (
            <button className="btn btn-ghost" onClick={() => { setSearch(''); setStatus('all') }}>
              <X size={13} /> Clear
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--c-text3)', fontWeight: 500 }}>
            {filtered.length} of {vendors.length} vendors
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div style={{
            padding: '10px 16px', background: 'var(--c-primary-lt)',
            borderBottom: '1px solid var(--c-border)',
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-primary)' }}>
              {selected.size} selected
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleBulkActivate}><UserCheck size={13} /> Activate</button>
            <button className="btn btn-ghost btn-sm" onClick={handleBulkDeactivate}><UserX size={13} /> Deactivate</button>
            <button className="btn btn-ghost btn-sm" onClick={handleExport}><Download size={13} /> Export Selected</button>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSelected(new Set())}>
              <X size={13} /> Clear
            </button>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 24px' }}>
            {vendors.length === 0 ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--c-primary-lt)', color: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Users size={26} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>No vendors added yet</h3>
                <p style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
                  Add your first vendor to start managing purchases, bills and payments.
                </p>
                <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
                  <Plus size={14} /> Add Vendor
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--c-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Search size={22} style={{ color: 'var(--c-text3)' }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No vendors match your filters</h3>
                <p style={{ fontSize: 13, color: 'var(--c-text2)', marginBottom: 16 }}>Try adjusting your search or filters.</p>
                <button className="btn btn-ghost" onClick={() => { setSearch(''); setStatus('all') }}>
                  <X size={13} /> Clear Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', display: 'flex', alignItems: 'center' }}
                      onClick={toggleAll}>
                      {allSelected ? <CheckSquare size={16} style={{ color: 'var(--c-primary)' }} /> : <Square size={16} />}
                    </button>
                  </th>
                  <th>Vendor</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Email / Phone</th>
                  <th>GST / Tax ID</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/vendors/${v.id}`)}>
                    <td onClick={e => e.stopPropagation()}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text3)', display: 'flex', alignItems: 'center' }}
                        onClick={() => toggleOne(v.id)}>
                        {selected.has(v.id)
                          ? <CheckSquare size={16} style={{ color: 'var(--c-primary)' }} />
                          : <Square size={16} />}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, background: 'var(--c-primary-lt)',
                          color: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, flexShrink: 0, textTransform: 'uppercase',
                        }}>
                          {fmt.initials(v.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--c-text)', fontSize: 13 }}>{v.name}</div>
                          {v.vendor_id && <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>#{v.vendor_id}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--c-text2)', fontSize: 13 }}>{v.company_name || '—'}</td>
                    <td style={{ fontSize: 13 }}>{v.contact_person || '—'}</td>
                    <td>
                      {v.email && <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>{v.email}</div>}
                      {v.phone && <div style={{ fontSize: 12, color: 'var(--c-text3)' }}>{v.phone}</div>}
                      {!v.email && !v.phone && <span style={{ color: 'var(--c-text3)' }}>—</span>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--c-primary)', fontWeight: 600 }}>
                      {v.gstin || <span style={{ color: 'var(--c-text3)', fontFamily: 'inherit', fontWeight: 400 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--c-text2)' }}>
                      {[v.city, v.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td><Badge status={v.status || 'active'} /></td>
                    <td className="right" onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <button className="topbar-icon-btn" title="View Profile" onClick={() => navigate(`/vendors/${v.id}`)}>
                          <Eye size={14} />
                        </button>
                        <button className="topbar-icon-btn" title="Edit" onClick={() => { setEditing(v); setFormOpen(true) }}>
                          <Edit2 size={14} />
                        </button>
                        <ActionsMenu
                          vendor={v}
                          onEdit={setEditing}
                          onDelete={handleDelete}
                          onDeactivate={(vendor, status) => confirmAction(`${status === 'active' ? 'Activate' : 'Deactivate'} "${vendor.name}"?`, () => statusMut.mutate({ id: vendor.id, status }))}
                          navigate={navigate}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {formOpen && (
        <Modal
          title={editing ? 'Edit Vendor' : 'New Vendor'}
          onClose={() => setFormOpen(false)}
          size="lg"
        >
          <VendorForm
            initial={editing}
            onSuccess={() => {
              setFormOpen(false)
              qc.invalidateQueries(['vendors'])
              toast.success(editing ? 'Vendor updated' : 'Vendor created')
            }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}

      {/* ── Import Modal ── */}
      {importOpen && (
        <Modal title="Import Vendors" onClose={() => setImportOpen(false)}>
          <ImportModal onClose={() => setImportOpen(false)} />
        </Modal>
      )}
    </div>
  )
}
