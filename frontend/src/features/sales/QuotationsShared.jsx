export const STATUS_META = {
  draft:       { label: 'Draft',       color: '#9aa3b2', bg: '#f1f3f5' },
  sent:        { label: 'Sent',        color: '#1a6be8', bg: '#eef4fd' },
  viewed:      { label: 'Viewed',      color: '#6b3fd4', bg: '#f3effe' },
  negotiation: { label: 'Negotiation', color: '#c97b10', bg: '#fef7e7' },
  approved:    { label: 'Approved',    color: '#0a8754', bg: '#e6f5ee' },
  rejected:    { label: 'Rejected',    color: '#d63d3d', bg: '#fdf0f0' },
  converted:   { label: 'Converted',   color: '#0891b2', bg: '#e0f2fe' },
  expired:     { label: 'Expired',     color: '#6b7280', bg: '#f9fafb' },
}

export const FUNNEL_STAGES  = ['draft','sent','viewed','negotiation','approved','converted']
export const FUNNEL_COLORS  = ['#9aa3b2','#1a6be8','#6b3fd4','#c97b10','#0a8754','#0891b2']
export const PROB_COLOR = p => p >= 75 ? '#0a8754' : p >= 50 ? '#c97b10' : '#d63d3d'
