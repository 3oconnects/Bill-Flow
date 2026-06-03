import { fmt } from '@/lib/utils'

export const TYPE_CONFIG = {
  'invoices': {
    title: 'A/P Invoice', hasItems: true,
    dateField: 'invoice_date', dateLabel: 'Invoice Date',
    extraFields: ['vendor_inv_no', 'po_ref', 'gr_ref', 'posting_date', 'due_date', 'discount_pct'],
    submitLabel: 'Submit Invoice',
  },
  'down-payments': {
    title: 'A/P Down Payment', hasItems: false,
    dateField: 'payment_date', dateLabel: 'Payment Date',
    extraFields: ['po_ref', 'due_date', 'pct_amount', 'tax_rate'],
    submitLabel: 'Submit Request',
  },
  'credit-memos': {
    title: 'A/P Credit Memo', hasItems: true,
    dateField: 'credit_date', dateLabel: 'Credit Date',
    extraFields: ['ref_invoice_no', 'posting_date', 'reason'],
    creditReasons: ['Return Goods','Price Adjustment','Quantity Adjustment','Damaged Goods','Duplicate Invoice','Overpayment Adjustment'],
    submitLabel: 'Submit Memo',
  },
  'reserve-invoices': {
    title: 'A/P Reserve Invoice', hasItems: true,
    dateField: 'invoice_date', dateLabel: 'Invoice Date',
    extraFields: ['vendor_ref_no','po_ref','gr_ref','posting_date','due_date','department','cost_center','project','description'],
    submitLabel: 'Submit Reserve Invoice',
  },
}

export function emptyItem() {
  return { _key: Date.now() + Math.random(), product_id: '', item_code: '', item_name: '', description: '', quantity: 1, unit_price: 0, discount: 0, tax_rate: 18, tax_amount: 0, line_total: 0 }
}

export function calcItem(it) {
  const base    = (it.quantity || 0) * (it.unit_price || 0)
  const discAmt = base * ((it.discount || 0) / 100)
  const taxable = base - discAmt
  const tax     = taxable * ((it.tax_rate || 0) / 100)
  return { ...it, tax_amount: +tax.toFixed(2), line_total: +(taxable + tax).toFixed(2) }
}

export function blankForm(cfg) {
  return {
    vendor_id: '', vendor_name: '', vendor_gstin: '', currency: 'INR',
    payment_terms: '', notes: '', amount: 0, tax_rate: 18,
    ...cfg.extraFields.reduce((a, k) => ({ ...a, [k]: '' }), {}),
    [cfg.dateField]: fmt.dateInput(new Date()),
  }
}
