import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore } from '@/store/toastStore'

const ICONS = {
  success: <CheckCircle size={16} />,
  error:   <XCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info:    <Info size={16} />,
}

export default function ToastContainer() {
  const { toasts, remove } = useToastStore()
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{ICONS[t.type]}</span>
          <span className="toast-message">{t.message}</span>
          <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', marginLeft: 4 }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
