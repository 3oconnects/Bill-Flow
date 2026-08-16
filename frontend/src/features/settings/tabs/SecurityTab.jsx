import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api'
import { toast } from '@/store/toastStore'
import { Spinner } from '@/components/ui'
import { useForm } from 'react-hook-form'
import { Lock } from 'lucide-react'

export default function SecurityTab() {
  const { register, handleSubmit, watch, reset, formState: { isSubmitting, errors } } = useForm()
  const newPw = watch('new_password')
  const mutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => { toast.success('Password changed successfully'); reset() },
    onError: (e) => toast.error(e.message),
  })
  return (
    <div style={{ maxWidth: 440 }}>
      <div style={{ fontSize: 11, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Change Password</div>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
        <div className="form-group">
          <label className="form-label">Current Password *</label>
          <input className="form-input" type="password" {...register('current_password', { required: true })} placeholder="••••••••" />
        </div>
        <div className="form-group">
          <label className="form-label">New Password *</label>
          <input className="form-input" type="password" {...register('new_password', { required: true, minLength: 8 })} placeholder="Min. 8 characters" />
          {errors.new_password?.type === 'minLength' && <div style={{ color: 'var(--c-danger)', fontSize: 11, marginTop: 4 }}>Password must be at least 8 characters</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password *</label>
          <input className="form-input" type="password" {...register('confirm_password', { required: true, validate: (v) => v === newPw || 'Passwords do not match' })} placeholder="Repeat new password" />
          {errors.confirm_password && <div style={{ color: 'var(--c-danger)', fontSize: 11, marginTop: 4 }}>{errors.confirm_password.message}</div>}
        </div>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? <Spinner size={14} /> : <><Lock size={14} /> Update Password</>}
        </button>
      </form>
    </div>
  )
}
