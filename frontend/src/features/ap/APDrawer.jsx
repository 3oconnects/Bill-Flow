import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Slide-over drawer from the right.
 * Props:
 *   open     – boolean
 *   onClose  – fn
 *   title    – string
 *   subtitle – string (optional)
 *   width    – css string, default '72%'
 *   actions  – ReactNode rendered in the header right side
 *   children – drawer body content
 */
export default function APDrawer({ open, onClose, title, subtitle, width = '72%', actions, children }) {
  // Lock body scroll while drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && open) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          backdropFilter: open ? 'blur(1px)' : 'none',
        }}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width, zIndex: 401,
          background: 'var(--c-bg)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: 56, flexShrink: 0,
          background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: 'var(--c-surface2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--c-text2)', flexShrink: 0,
              }}
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: 11, color: 'var(--c-text2)', marginTop: 1 }}>{subtitle}</div>
              )}
            </div>
          </div>

          {actions && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {actions}
            </div>
          )}
        </div>

        {/* Body (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {open && children}
        </div>
      </div>
    </>
  )
}
