import APTabShell, { APStatusBadge } from './APTabShell'
import { fmt } from '@/lib/utils'

const STATUS_OPTS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved',  label: 'Approved' },
  { value: 'reserved',  label: 'Reserved' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed',    label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const COLUMNS = [
  { key: 'doc_no',        label: 'Reserve No',    render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--c-primary)', fontSize: 13 }}>{v}</span> },
  { key: 'vendor_name',   label: 'Vendor',         render: (v, r) => <div><div style={{ fontWeight: 500 }}>{v}</div>{r.vendor_ref_no && <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Ref: {r.vendor_ref_no}</div>}</div> },
  { key: 'po_ref',        label: 'PO Number',      render: v => v || '—' },
  { key: 'gr_ref',        label: 'GR Number',      render: v => v || '—' },
  { key: 'invoice_date',  label: 'Invoice Date',   render: v => fmt.date(v) },
  { key: 'due_date',      label: 'Due Date',       render: (v, r) => {
    if (!v) return '—'
    const overdue = new Date(v) < new Date() && !['converted','closed','cancelled'].includes(r.status)
    return <span style={{ color: overdue ? 'var(--c-red)' : 'inherit', fontWeight: overdue ? 600 : 400 }}>{fmt.date(v)}</span>
  }},
  { key: 'total_amount',  label: 'Reserve Amount', align: 'right', render: v => <span style={{ fontWeight: 700 }}>{fmt.currency(v)}</span> },
  { key: 'status',        label: 'Status',         render: v => <APStatusBadge status={v} /> },
]

export default function APReserveInvoicesTab({ onRowClick }) {
  return (
    <APTabShell
      type="reserve-invoices"
      onRowClick={onRowClick}
      statCards={s => [
        { label: 'Total Reserve Inv.',   value: s.total ?? '—',                      color: 'blue' },
        { label: 'Pending Approval',     value: s.pending_approval ?? '—',           color: 'orange' },
        { label: 'Outstanding Liability',value: fmt.currency(s.outstanding_liability ?? 0), color: 'red' },
        { label: 'Converted',            value: s.converted ?? '—',                  color: 'green', sub: 'To A/P invoices' },
      ]}
      statusOptions={STATUS_OPTS}
      columns={COLUMNS}
      emptyTitle="No reserve invoices"
      emptyDescription="Record liabilities before receiving actual vendor invoices for proper accrual tracking."
    />
  )
}
