import APTabShell, { APStatusBadge } from './APTabShell'
import { fmt } from '@/lib/utils'

const STATUS_OPTS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'approved',  label: 'Approved' },
  { value: 'paid',      label: 'Paid' },
  { value: 'closed',    label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const COLUMNS = [
  { key: 'doc_no',        label: 'Request No',  render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--c-primary)', fontSize: 13 }}>{v}</span> },
  { key: 'vendor_name',   label: 'Vendor',       render: (v, r) => <div><div style={{ fontWeight: 500 }}>{v}</div>{r.po_ref && <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>PO: {r.po_ref}</div>}</div> },
  { key: 'payment_date',  label: 'Payment Date', render: v => fmt.date(v) },
  { key: 'due_date',      label: 'Due Date',     render: v => v ? fmt.date(v) : '—' },
  { key: 'amount',        label: 'Amount',       align: 'right', render: (v, r) => <div style={{ textAlign: 'right' }}><div>{fmt.currency(v)}</div>{r.pct_amount && <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{r.pct_amount}%</div>}</div> },
  { key: 'tax_amount',    label: 'Tax',          align: 'right', render: v => fmt.currency(v) },
  { key: 'total_amount',  label: 'Total',        align: 'right', render: v => <span style={{ fontWeight: 700 }}>{fmt.currency(v)}</span> },
  { key: 'currency',      label: 'Currency' },
  { key: 'status',        label: 'Status',       render: v => <APStatusBadge status={v} /> },
]

export default function APDownPaymentsTab({ onRowClick }) {
  return (
    <APTabShell
      type="down-payments"
      onRowClick={onRowClick}
      statCards={s => [
        { label: 'Total Requests',   value: s.total ?? '—',               color: 'blue' },
        { label: 'Approved',         value: s.approved ?? '—',            color: 'green' },
        { label: 'Total Paid',       value: fmt.currency(s.total_paid ?? 0),  color: 'green', sub: 'Disbursed' },
        { label: 'Outstanding',      value: fmt.currency(s.outstanding ?? 0), color: 'orange', sub: 'Draft + Approved' },
      ]}
      statusOptions={STATUS_OPTS}
      columns={COLUMNS}
      emptyTitle="No down payment requests"
      emptyDescription="Record advance payments made to suppliers before goods are received."
    />
  )
}
