import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, footer, size = '' }) {
  const sizeClass = size ? `modal-${size}` : ''
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${sizeClass}`}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
