import React from 'react'

/**
 * EmptyState - A premium empty state component for lists/tables
 * @param {string} icon - Lucide Icon component
 * @param {string} title - Main headline
 * @param {string} description - Subtitle explaining what to do
 * @param {ReactNode} action - Optional action button
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state-wrapper">
      <div className="empty-state-icon">
        {Icon && <Icon size={32} strokeWidth={1.5} />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}
