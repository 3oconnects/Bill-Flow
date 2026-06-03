import { Clock, CheckCircle2, DollarSign, ShieldAlert } from 'lucide-react'

export const STATUS_META = {
  draft:          { label: 'Draft',           color: '#9aa3b2', bg: '#f1f3f5' },
  pending_review: { label: 'Pending Review',  color: '#c97b10', bg: '#fef7e7' },
  approved:       { label: 'Approved',        color: '#0a8754', bg: '#e6f5ee' },
  applied:        { label: 'Applied',         color: '#0891b2', bg: '#e0f2fe' },
  closed:         { label: 'Closed',          color: '#6b7280', bg: '#f9fafb' },
  rejected:       { label: 'Rejected',        color: '#d63d3d', bg: '#fdf0f0' },
}

export const REASON_META = {
  damaged_product: { label: 'Damaged Product',  color: '#d63d3d', icon: '📦' },
  wrong_product:   { label: 'Wrong Product',    color: '#c97b10', icon: '🔄' },
  pricing_error:   { label: 'Pricing Error',    color: '#6b3fd4', icon: '💰' },
  service_issue:   { label: 'Service Issue',    color: '#1a6be8', icon: '🛠️' },
  cancellation:    { label: 'Cancellation',     color: '#9aa3b2', icon: '✕' },
  quality_problem: { label: 'Quality Problem',  color: '#c97b10', icon: '⚠️' },
  other:           { label: 'Other',            color: '#6b7280', icon: '📋' },
}

export const WORKFLOW_STAGES = [
  { id: 'pending_review', label: 'Under Review',   icon: Clock },
  { id: 'approved',       label: 'Finance Approved', icon: CheckCircle2 },
  { id: 'applied',        label: 'Credit Applied',  icon: DollarSign },
  { id: 'closed',         label: 'Closed',          icon: ShieldAlert },
]

export function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft
  return (
    <span style={{ background: m.bg, color: m.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
      {m.label}
    </span>
  )
}

export function ReasonBadge({ reason }) {
  const m = REASON_META[reason] || REASON_META.other
  return (
    <span style={{ fontSize: 11, color: m.color, fontWeight: 600 }}>
      {m.icon} {m.label}
    </span>
  )
}
