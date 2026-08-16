import React from 'react'
import Modal from '@/components/Modal'
import { useConfirmStore } from '@/store/confirmStore'

export default function ConfirmDialog() {
  const { isOpen, message, onConfirm, closeConfirm } = useConfirmStore()

  if (!isOpen) return null

  return (
    <Modal 
      title="Confirm Action" 
      size="sm"
      onClose={closeConfirm}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
          <button className="btn btn-ghost" onClick={closeConfirm}>Cancel</button>
          <button className="btn" style={{ background: 'var(--c-red)', color: 'white' }} onClick={onConfirm}>
            Delete
          </button>
        </div>
      }
    >
      <div style={{ padding: '20px 0' }}>
        <p style={{ margin: 0 }}>{message}</p>
        <p style={{ margin: '8px 0 0', color: 'var(--c-text3)', fontSize: '13px' }}>This action cannot be undone.</p>
      </div>
    </Modal>
  )
}
