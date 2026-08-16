import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '@/api'
import { PageLoading } from '@/components/ui'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No verification token provided.')
      return
    }

    const verify = async () => {
      try {
        await authApi.verifyEmail(token)
        setStatus('success')
        // We could invalidate the user query here if they are logged in,
        // but typically they might be on a new device.
        setTimeout(() => {
          navigate('/dashboard')
        }, 3000)
      } catch (err) {
        setStatus('error')
        setErrorMsg(err.message || 'Verification failed. The link may have expired.')
      }
    }

    verify()
  }, [token, navigate])

  if (status === 'verifying') {
    return <PageLoading />
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--c-bg)', padding: 20 }}>
      <div style={{ background: 'var(--c-surface)', padding: 40, borderRadius: 24, border: '1px solid var(--c-border)', textAlign: 'center', maxWidth: 400, width: '100%' }}>
        {status === 'success' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={32} color="#10b981" />
              </div>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Email Verified!</h2>
            <p style={{ color: 'var(--c-text2)', marginBottom: 24 }}>Thank you for verifying your email address. You will be redirected to the dashboard shortly.</p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ width: '100%', justifyContent: 'center' }}>
              Go to Dashboard Now
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={32} color="#ef4444" />
              </div>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Verification Failed</h2>
            <p style={{ color: 'var(--c-text2)', marginBottom: 24 }}>{errorMsg}</p>
            <button className="btn btn-secondary" onClick={() => navigate('/login')} style={{ width: '100%', justifyContent: 'center' }}>
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
