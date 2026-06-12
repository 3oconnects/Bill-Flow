// Shared constants + helpers for the recurring billing surface.

export const FREQUENCIES = [
  { value: 'daily',     label: 'Daily',      hint: 'Every day',         perMonth: 30 },
  { value: 'weekly',    label: 'Weekly',     hint: 'Every 7 days',      perMonth: 4.345 },
  { value: 'bimonthly', label: 'Bi-Monthly', hint: 'Every 2 weeks',     perMonth: 2.172 },
  { value: 'monthly',   label: 'Monthly',    hint: 'Same day each month', perMonth: 1 },
  { value: 'quarterly', label: 'Quarterly',  hint: 'Every 3 months',    perMonth: 1 / 3 },
  { value: 'biannual',  label: 'Bi-Annual',  hint: 'Every 6 months',    perMonth: 1 / 6 },
  { value: 'yearly',    label: 'Yearly',     hint: 'Once a year',       perMonth: 1 / 12 },
]

export const FREQ_LABELS = FREQUENCIES.reduce((acc, f) => {
  acc[f.value] = f.label; return acc
}, {})

const PER_MONTH = FREQUENCIES.reduce((acc, f) => {
  acc[f.value] = f.perMonth; return acc
}, {})

/**
 * Convert any cycle amount to its monthly equivalent.
 * e.g. daily ₹100 -> ₹3,000/month, yearly ₹120 -> ₹10/month.
 */
export const monthlyEquivalent = (amount, frequency) => {
  const a = Number(amount) || 0
  const f = PER_MONTH[frequency] ?? 0
  return a * f
}

/**
 * Sum of monthly equivalents across an array of active templates.
 */
export const totalMonthlyValue = (items) => items
  .filter(i => i.status === 'active')
  .reduce((s, i) => s + monthlyEquivalent(i.amount, i.frequency), 0)

export const PAYMENT_TERMS = [
  { value: '0',  label: 'Due on receipt' },
  { value: '7',  label: 'Net 7 days'  },
  { value: '15', label: 'Net 15 days' },
  { value: '30', label: 'Net 30 days' },
  { value: '45', label: 'Net 45 days' },
  { value: '60', label: 'Net 60 days' },
]

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED']
export const GST_RATES  = [0, 5, 12, 18, 28]
