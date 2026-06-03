import { STATUS_META } from './QuotationsShared'

export function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft
  return (
    <span style={{ background: m.bg, color: m.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
      {m.label}
    </span>
  )
}

export function AICard({ icon: Icon, color, title, body, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
      background: color + '08', border: `1px solid ${color}22`, borderRadius: 10, marginBottom: 8,
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--c-text2)', lineHeight: 1.5 }}>{body}</div>
      </div>
      {action && (
        <button style={{ background: 'none', border: 'none', color, cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {action} →
        </button>
      )}
    </div>
  )
}
