import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui'

export default function ProfileTab() {
  const { user } = useAuthStore()
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: 20, background: 'var(--c-surface2)', borderRadius: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,var(--c-primary),#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'white' }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.name}</div>
          <div style={{ color: 'var(--c-text2)', fontSize: 13 }}>{user?.email}</div>
          <div style={{ marginTop: 6 }}><Badge status={user?.role} /></div>
        </div>
      </div>
      {[['Full Name', user?.name], ['Email Address', user?.email], ['Role', user?.role], ['User ID', user?.id]].map(([l, v]) => (
        <div key={l} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--c-border)', fontSize: 13 }}>
          <span style={{ color: 'var(--c-text3)', width: 140, flexShrink: 0 }}>{l}</span>
          <span style={{ fontFamily: l === 'User ID' ? 'monospace' : 'inherit', textTransform: l === 'Role' ? 'capitalize' : 'none' }}>{v || '—'}</span>
        </div>
      ))}
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: 12, color: '#d97706' }}>
        To change your name or email, contact your organization administrator.
      </div>
    </div>
  )
}
