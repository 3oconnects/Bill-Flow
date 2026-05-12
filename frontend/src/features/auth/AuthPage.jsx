import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { ROLE_DEFAULT_PAGE } from '@/lib/utils'
import { Spinner } from '@/components/ui'

function PasswordInput({ register, name, placeholder, error }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        className="form-input"
        placeholder={placeholder}
        style={{ paddingRight: 40 }}
        {...register}
      />
      <button type="button" onClick={() => setShow((s) => !s)}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      {error && <div className="form-err">{error}</div>}
    </div>
  )
}

function LoginForm({ onSwitch }) {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async (data) => {
    try {
      const res = await authApi.login(data)
      setAuth(res.user, res.org)
      navigate(ROLE_DEFAULT_PAGE[res.user.role] || '/dashboard')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-sub">Sign in to your billing workspace</p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label className="form-label">Email address</label>
          <input className="form-input" type="email" placeholder="you@company.com"
            {...register('email', { required: 'Email is required' })} />
          {errors.email && <div className="form-err">{errors.email.message}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <PasswordInput
            register={register('password', { required: 'Password is required' })}
            placeholder="Your password"
            error={errors.password?.message}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '11px' }} disabled={isSubmitting}>
          {isSubmitting ? <Spinner size={16} /> : 'Sign In'}
        </button>
      </form>
    </>
  )
}

function RegisterForm({ onSwitch }) {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async (data) => {
    try {
      const res = await authApi.register(data)
      setAuth(res.user, res.org)
      navigate('/dashboard')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <>
      <h1 className="auth-title">Create your workspace</h1>
      <p className="auth-sub">Set up your billing account in seconds</p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label className="form-label">Business / Org Name</label>
          <input className="form-input" placeholder="Acme Technologies Pvt Ltd"
            {...register('orgName', { required: 'Organization name is required' })} />
          {errors.orgName && <div className="form-err">{errors.orgName.message}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Your Full Name</label>
          <input className="form-input" placeholder="Jane Smith"
            {...register('name', { required: 'Name is required' })} />
          {errors.name && <div className="form-err">{errors.name.message}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Work Email</label>
          <input className="form-input" type="email" placeholder="you@company.com"
            {...register('email', { required: 'Email is required' })} />
          {errors.email && <div className="form-err">{errors.email.message}</div>}
        </div>
        <div className="form-row cols-2">
          <div className="form-group">
            <label className="form-label">Password</label>
            <PasswordInput
              register={register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })}
              placeholder="Min 8 characters"
              error={errors.password?.message}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <PasswordInput
              register={register('confirmPassword', {
                required: 'Required',
                validate: (val) => val === watch('password') || 'Passwords do not match'
              })}
              placeholder="Repeat password"
              error={errors.confirmPassword?.message}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '11px' }} disabled={isSubmitting}>
          {isSubmitting ? <Spinner size={16} /> : 'Create Workspace'}
        </button>
      </form>
    </>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">Bill<span>Flow</span> Pro</div>
          <div className="auth-tagline">Cloud Billing & ERP for India</div>
        </div>
        <div className="auth-body">
          {mode === 'login'
            ? <LoginForm onSwitch={() => setMode('register')} />
            : <RegisterForm onSwitch={() => setMode('login')} />}
        </div>
        <div className="auth-footer">
          {mode === 'login' ? (
            <>Don't have an account? <a onClick={() => setMode('register')}>Create one free</a></>
          ) : (
            <>Already have an account? <a onClick={() => setMode('login')}>Sign in</a></>
          )}
        </div>
      </div>
    </div>
  )
}
