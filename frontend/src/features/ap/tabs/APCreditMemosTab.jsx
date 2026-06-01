import APTabShell, { APStatusBadge } from './APTabShell'
import { fmt } from '@/lib/utils'

const STATUS_OPTS = [
  { value: 'draft',            label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved',         label: 'Approved' },
  { value: 'applied',          label: 'Applied' },
  { value: 'closed',           label: 'Closed' },
  { value: 'cancelled',        label: 'Cancelled' },
]

const COLUMNS = [
  { key: 'doc_no',          label: 'Memo No',       render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--c-primary)', fontSize: 13 }}>{v}</span> },
  { key: 'vendor_name',     label: 'Vendor',         render: v => <span style={{ fontWeight: 500 }}>{v}</span> },
  { key: 'ref_invoice_no',  label: 'Related Invoice', render: v => v || '—' },
  { key: 'credit_date',     label: 'Credit Date',    render: v => fmt.date(v) },
  { key: 'reason',          label: 'Reason',          render: v => <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--c-orange-lt)', color: 'var(--c-orange)', fontWeight: 600 }}>{v}</span> },
  { key: 'total_amount',    label: 'Credit Amount',  align: 'right', render: v => <span style={{ fontWeight: 700 }}>{fmt.currency(v)}</span> },
  { key: 'applied_amount',  label: 'Applied',        align: 'right', render: v => fmt.currency(v) },
  { key: 'balance_amount',  label: 'Balance',        align: 'right', render: v => <span style={{ color: parseFloat(v) > 0 ? 'var(--c-green)' : 'var(--c-text3)', fontWeight: 600 }}>{fmt.currency(v)}</span> },
  { key: 'status',          label: 'Status',         render: v => <APStatusBadge status={v} /> },
]

export default function APCreditMemosTab({ onRowClick }) {
  return (
    <APTabShell
      type="credit-memos"
      onRowClick={onRowClick}
      statCards={s => [
        { label: 'Total Memos',         value: s.total ?? '—',                   color: 'blue' },
        { label: 'Pending Approval',    value: s.pending ?? '—',                 color: 'orange' },
        { label: 'Total Credits',       value: fmt.currency(s.total_credits ?? 0), color: 'green', sub: 'Approved + Applied' },
        { label: 'Available Balance',   value: fmt.currency(s.available_balance ?? 0), color: 'purple', sub: 'Unapplied credits' },
      ]}
      statusOptions={STATUS_OPTS}
      columns={COLUMNS}
      emptyTitle="No credit memos"
      emptyDescription="Create credit memos for returned goods, price adjustments, or invoice corrections."
    />
  )
}
