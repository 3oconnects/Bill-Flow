import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Search, MoreVertical, Eye, Edit2, Trash2, Users, FileText,
  Filter, Download, Upload, ArrowUpDown, ChevronLeft, ChevronRight,
  TrendingUp, Clock, AlertCircle, CheckCircle2, UserPlus, Mail, Phone
} from 'lucide-react'
import { customersApi } from '@/api'
import { fmt, statusBadge } from '@/lib/utils'
import { PageLoading, EmptyState, Badge } from '@/components/ui'
import { toast } from '@/store/toastStore'
import Modal from '@/components/Modal'
import { useTopbarStore } from '@/store/topbarStore'
import CustomerForm from './CustomerForm'


const CUSTOMER_STATUS_TABS = ['all', 'active', 'inactive']

export default function CustomersPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [activeStatusTab, setActiveStatusTab] = useState('all')
  const [filterCity, setFilterCity] = useState('all')
  const [filterCountry, setFilterCountry] = useState('all')
  const [filterCurrency, setFilterCurrency] = useState('all')
  const [onlyOutstanding, setOnlyOutstanding] = useState(false)
  const [onlyRecent, setOnlyRecent] = useState(false)
  const [sortField, setSortField] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  })

  const setActions = useTopbarStore(s => s.setActions)
  const setContext = useTopbarStore(s => s.setContext)
  const clear = useTopbarStore(s => s.clear)
 
 
  const deleteMut = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => { qc.invalidateQueries(['customers']); toast.success('Customer deleted') },
    onError: (e) => toast.error(e.message),
  })

  const stats = useMemo(() => {
    const total = customers.length
    const active = customers.filter(c => c.status === 'active').length
    const outstanding = customers.reduce((s, c) => s + Number(c.outstanding || 0), 0)
    const newThisMonth = customers.filter(c => {
      const date = new Date(c.created_at)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length
    return { total, active, outstanding, newThisMonth }
  }, [customers])

  const filteredAndSorted = useMemo(() => {
    let result = [...customers]

    if (search) {
      const s = search.toLowerCase()
      result = result.filter(c => 
        c.name?.toLowerCase().includes(s) || 
        c.email?.toLowerCase().includes(s) || 
        c.phone?.includes(s) ||
        c.company_name?.toLowerCase().includes(s) ||
        c.gstin?.toLowerCase().includes(s)
      )
    }

    if (activeStatusTab !== 'all') {
      result = result.filter(c => c.status === activeStatusTab)
    }

    // Filter by City
    if (filterCity !== 'all') {
      result = result.filter(c => c.city === filterCity)
    }

    // Filter by Country
    if (filterCountry !== 'all') {
      result = result.filter(c => c.country === filterCountry)
    }

    // Filter by Currency
    if (filterCurrency !== 'all') {
      result = result.filter(c => c.currency === filterCurrency)
    }

    // Filter by Outstanding
    if (onlyOutstanding) {
      result = result.filter(c => Number(c.outstanding) > 0)
    }

    // Filter by Recently Added (Last 30 days)
    if (onlyRecent) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      result = result.filter(c => new Date(c.created_at) >= thirtyDaysAgo)
    }

    result.sort((a, b) => {
      let valA = a[sortField] || ''
      let valB = b[sortField] || ''
      
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [customers, search, activeStatusTab, filterCity, filterCountry, filterCurrency, onlyOutstanding, onlyRecent, sortField, sortOrder])

  const handleExport = useCallback(() => {
    if (filteredAndSorted.length === 0) return toast.error('No data to export')
    
    const headers = ['Name', 'Email', 'Phone', 'Company', 'GSTIN', 'City', 'State', 'Outstanding', 'Status']
    const csvContent = [
      headers.join(','),
      ...filteredAndSorted.map(c => [
        `"${c.name}"`,
        `"${c.email}"`,
        `"${c.phone}"`,
        `"${c.company_name}"`,
        `"${c.gstin}"`,
        `"${c.city}"`,
        `"${c.state}"`,
        c.outstanding,
        c.status
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Export started')
  }, [filteredAndSorted])

  const handleImport = useCallback(async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target.result
        const lines = text.split('\n').filter(l => l.trim())
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const obj = {}
          headers.forEach((h, i) => {
            const key = h.toLowerCase().replace(/ /g, '_')
            obj[key] = values[i]
          })
          return obj
        })

        toast.info(`Importing ${data.length} customers...`)
        
        for (const customer of data) {
          await customersApi.create(customer)
        }

        toast.success('Import completed successfully')
        qc.invalidateQueries(['customers'])
      } catch (err) {
        toast.error('Failed to parse CSV. Please check the format.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [qc])

  useEffect(() => {
    setContext('Customers', 'Manage your clients')
    return clear
  }, [setContext, clear])

  useEffect(() => {
    setActions(
      <div style={{ display: 'flex', gap: 8 }}>
        <input 
          type="file" 
          id="import-input" 
          style={{ display: 'none' }} 
          accept=".csv" 
          onChange={(e) => handleImport(e)} 
        />
        <button className="btn btn-ghost" title="Import" onClick={() => document.getElementById('import-input').click()}>
          <Upload size={15} /> Import
        </button>
        <button className="btn btn-ghost" title="Export" onClick={() => handleExport()}>
          <Download size={15} /> Export
        </button>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus size={15} /> New Customer
        </button>
      </div>
    )
  }, [setActions, handleExport, handleImport])

  const paginated = filteredAndSorted.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(filteredAndSorted.length / pageSize)

  const uniqueCities = useMemo(() => [...new Set(customers.map(c => c.city).filter(Boolean))].sort(), [customers])
  const uniqueCountries = useMemo(() => [...new Set(customers.map(c => c.country).filter(Boolean))].sort(), [customers])
  const uniqueCurrencies = useMemo(() => [...new Set(customers.map(c => c.currency).filter(Boolean))].sort(), [customers])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleDelete = (c) => {
    if (window.confirm(`Delete customer "${c.name}"? This cannot be undone.`)) {
      deleteMut.mutate(c.id)
    }
  }

  const handleSendReminder = (e, c) => {
    e.stopPropagation()
    toast.success(`Reminder sent to ${c.email}`)
  }

  const handleResetFilters = () => {
    setSearch('')
    setActiveStatusTab('all')
    setFilterCity('all')
    setFilterCountry('all')
    setFilterCurrency('all')
    setOnlyOutstanding(false)
    setOnlyRecent(false)
    setPage(1)
  }

  if (isLoading) return <PageLoading />
 
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 0 }}>
        <div className="kpi-card blue">
          <div className="kpi-icon"><Users size={20} /></div>
          <div className="kpi-label">Total Customers</div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-sub">Registered Records</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon"><CheckCircle2 size={20} /></div>
          <div className="kpi-label">Active Customers</div>
          <div className="kpi-value">{stats.active}</div>
          <div className="kpi-sub">{((stats.active / (stats.total || 1)) * 100).toFixed(0)}% Active Rate</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><Clock size={20} /></div>
          <div className="kpi-label">Outstanding</div>
          <div className="kpi-value">{fmt.currency(stats.outstanding)}</div>
          <div className="kpi-sub">Pending Payments</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><UserPlus size={20} /></div>
          <div className="kpi-label">New This Month</div>
          <div className="kpi-value">{stats.newThisMonth}</div>
          <div className="kpi-sub">Last 30 Days</div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="tabs" style={{ marginBottom: 0 }}>
        {CUSTOMER_STATUS_TABS.map((s) => (
          <button key={s} className={`tab-btn${activeStatusTab === s ? ' active' : ''}`} onClick={() => { setActiveStatusTab(s); setPage(1); }}>
            {s === 'all' ? 'All Customers' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {/* Advanced Filter Bar - Simplified layout */}
        <div className="filter-bar" style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="search-wrap" style={{ width: 320 }}>
            <Search className="search-icon" size={16} />
            <input 
              className="form-input" 
              style={{ paddingLeft: 36 }} 
              placeholder="Search customers..." 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            />
          </div>
          
          <div className="spacer" />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="form-select sm" style={{ width: 110 }} value={filterCity} onChange={(e) => { setFilterCity(e.target.value); setPage(1); }}>
              <option value="all">Cities</option>
              {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
            </select>

            <select className="form-select sm" style={{ width: 110 }} value={filterCountry} onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}>
              <option value="all">Countries</option>
              {uniqueCountries.map(country => <option key={country} value={country}>{country}</option>)}
            </select>

            <button className="btn btn-ghost sm" title="Reset Filters" onClick={handleResetFilters}>
              <ArrowUpDown size={14} style={{ transform: 'rotate(90deg)' }} />
            </button>
          </div>
        </div>

        {filteredAndSorted.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <EmptyState title="No customers found" description="Try adjusting your search or filters." icon={<Users size={48} />} />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table-hover">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Customer Name <ArrowUpDown size={12} style={{ opacity: sortField === 'name' ? 1 : 0.3 }} />
                    </div>
                  </th>
                  <th className="hide-mobile">Contact Info</th>
                  <th className="hide-mobile">Company & GSTIN</th>
                  <th onClick={() => handleSort('outstanding')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Outstanding <ArrowUpDown size={12} style={{ opacity: sortField === 'outstanding' ? 1 : 0.3 }} />
                    </div>
                  </th>
                  <th>Status</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>
                          {fmt.initials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.customer_id_display || 'ID-0000'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hide-mobile">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-2)' }}>
                          <Mail size={12} style={{ color: 'var(--text-3)' }} /> {c.email || '—'}
                        </div>
                        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-2)' }}>
                          <Phone size={12} style={{ color: 'var(--text-3)' }} /> {c.phone || '—'}
                        </div>
                      </div>
                    </td>
                    <td className="hide-mobile">
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{c.company_name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{c.gstin || 'No GSTIN'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: Number(c.outstanding) > 0 ? 'var(--red)' : 'var(--green)' }}>
                        {fmt.currency(c.outstanding)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Limit: {fmt.currency(c.credit_limit)}</div>
                    </td>
                    <td>
                      <Badge status={c.status} label={c.status?.toUpperCase()} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="topbar-icon-btn" title="View" onClick={() => navigate(`/customers/${c.id}`)}>
                          <Eye size={14} />
                        </button>
                        <button className="topbar-icon-btn" title="Create Invoice" onClick={() => navigate(`/invoices/new?customer_id=${c.id}&customer_name=${encodeURIComponent(c.name)}`)}>
                          <FileText size={14} />
                        </button>
                        <button className="topbar-icon-btn" title="Edit" onClick={() => { setEditing(c); setFormOpen(true) }}>
                          <Edit2 size={14} />
                        </button>
                        <button className="topbar-icon-btn" title="Send Reminder" onClick={(e) => handleSendReminder(e, c)} style={{ color: 'var(--accent)' }}>
                          <Mail size={14} />
                        </button>
                        <button className="topbar-icon-btn" title="Delete" onClick={() => handleDelete(c)} style={{ color: 'var(--red)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length} customers
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={16} /> Previous
              </button>
              <button className="btn btn-ghost sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <Modal title={editing ? 'Edit Customer' : 'New Customer'} onClose={() => setFormOpen(false)} size="lg">
          <CustomerForm
            initial={editing}
            onSuccess={() => { setFormOpen(false); qc.invalidateQueries(['customers']); toast.success(editing ? 'Customer updated' : 'Customer created') }}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .summary-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08);
          border-color: var(--accent);
        }
        .table-hover tbody tr:hover {
          background-color: var(--bg-2);
        }
        @media (max-width: 768px) {
          .hide-mobile { display: none; }
          .summary-card-hover { min-width: 100% !important; }
        }
      `}} />
    </div>
  )
}
