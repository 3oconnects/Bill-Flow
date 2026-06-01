import APTabShell, { APStatusBadge } from './APTabShell'
import { fmt } from '@/lib/utils'

const STATUS_OPTS = [
  { value: 'draft',           label: 'Draft' },
  { value: 'submitted',       label: 'Submitted' },
  { value: 'approved',        label: 'Approved' },
  { value: 'partially_paid',  label: 'Partially Paid' },
  { value: 'paid',            label: 'Paid' },
  { value: 'closed',          label: 'Closed' },
  { value: 'cancelled',       label: 'Cancelled' },
]

const COLUMNS = [
  { key: 'doc_no',         label: 'Invoice No',     render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--c-primary)', fontSize: 13 }}>{v}</span> },
  { key: 'vendor_name',    label: 'Vendor',          render: (v, r) => <div><div style={{ fontWeight: 500 }}>{v}</div>{r.vendor_inv_no && <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Ref: {r.vendor_inv_no}</div>}</div> },
  { key: 'po_ref',         label: 'PO Number',       render: v => v || '—' },
  { key: 'invoice_date',   label: 'Invoice Date',    render: v => fmt.date(v) },
  { key: 'due_date',       label: 'Due Date',        render: (v, r) => {
    if (!v) return '—'
    const overdue = new Date(v) < new Date() && !['paid','closed','cancelled'].includes(r.status)
    return <span style={{ color: overdue ? 'var(--c-red)' : 'inherit', fontWeight: overdue ? 600 : 400 }}>{fmt.date(v)}</span>
  }},
  { key: 'total_amount',   label: 'Total',           align: 'right', render: v => <span style={{ fontWeight: 600 }}>{fmt.currency(v)}</span> },
  { key: 'paid_amount',    label: 'Paid',            align: 'right', render: v => fmt.currency(v) },
  { key: 'balance_due',    label: 'Balance Due',     align: 'right', render: v => <span style={{ color: parseFloat(v) > 0 ? 'var(--c-red)' : 'var(--c-green)', fontWeight: 600 }}>{fmt.currency(v)}</span> },
  { key: 'status',         label: 'Status',          render: v => <APStatusBadge status={v} /> },
]

export default function APInvoicesTab({ onRowClick }) {
  return (
    <APTabShell
      type="invoices"
      onRowClick={onRowClick}
      statCards={s => [
        { label: 'Total Invoices',    value: s.total ?? '—',        color: 'blue' },
        { label: 'Pending Approval',  value: s.pending ?? '—',      color: 'orange', sub: 'Submitted / Approved' },
        { label: 'Total Value',       value: fmt.currency(s.total_value ?? 0), color: 'blue' },
        { label: 'Outstanding',       value: fmt.currency(s.outstanding ?? 0), color: 'red', sub: 'Unpaid balance' },
      ]}
      statusOptions={STATUS_OPTS}
      columns={COLUMNS}
      emptyTitle="No A/P invoices yet"
      emptyDescription="Create your first supplier invoice to start tracking payables."
    />
  )
}
