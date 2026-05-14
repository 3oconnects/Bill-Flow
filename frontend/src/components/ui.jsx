export function Spinner({ size = 18, dark = false }) {
  return <div className={`spinner${dark ? ' spinner-dark' : ''}`} style={{ width: size, height: size }} />
}

export function PageLoading() {
  return (
    <div className="page-loading">
      <div className="spinner spinner-dark" style={{ width: 24, height: 24 }} />
      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Loading…</span>
    </div>
  )
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

export function Badge({ status, label }) {
  // Maps status → CSS class (all defined in index.css)
  const cls = status ? `badge-${status.toString().toLowerCase().replace(/ /g, '_')}` : 'badge-draft'
  return <span className={`badge ${cls}`}>{label ?? status}</span>
}

export function Modal({ children, isOpen, onClose, title, size = 'md', footer }) {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="action-icon-btn" onClick={onClose} style={{ fontSize: 20 }}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

