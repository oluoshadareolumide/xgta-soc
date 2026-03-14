import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Login failed')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#070d1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Space Mono', monospace",
    }}>
      <div style={{
        width: 400, background: '#0d1525',
        border: '1px solid #1e2535', borderRadius: 12, padding: 40,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, background: 'linear-gradient(135deg, #c084fc, #818cf8)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 16px',
          }}>⬡</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.04em' }}>XGTA-SOC</div>
          <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.12em', marginTop: 4 }}>
            EXPLAINABLE GRAPH THREAT ATTRIBUTION
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
              USERNAME
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={{
                width: '100%', padding: '10px 12px',
                background: '#111827', border: '1px solid #1e2535',
                borderRadius: 6, color: '#e2e8f0', fontSize: 13,
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%', padding: '10px 12px',
                background: '#111827', border: '1px solid #1e2535',
                borderRadius: 6, color: '#e2e8f0', fontSize: 13,
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)',
              borderRadius: 6, padding: '8px 12px', marginBottom: 16,
              fontSize: 12, color: '#ff3b3b',
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%', padding: 12,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', borderRadius: 6, color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.08em',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? '⟳ AUTHENTICATING…' : '→ SIGN IN'}
          </button>
        </form>

        <div style={{ marginTop: 20, fontSize: 10, color: '#334155', textAlign: 'center' }}>
          Default: admin / Admin1234!
        </div>
      </div>
    </div>
  )
}
