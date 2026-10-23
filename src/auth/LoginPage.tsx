import { useState } from 'react'
import './LoginPage.css'
import {
  saveSession,
  DEFAULT_ADMIN_USER,
  DEFAULT_CUSTOMER_USER,
  DEMO_CUSTOMERS,
  type UserSession,
  type UserRole,
} from './authStore'

interface LoginPageProps {
  onSuccess: (session: UserSession) => void
  onCancel?: () => void
  initialRole?: UserRole
}

export function LoginPage({ onSuccess, onCancel, initialRole = 'customer' }: LoginPageProps) {
  const [role, setRole] = useState<UserRole>(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState('')

  const handleSelectSession = (session: UserSession) => {
    saveSession(session)
    onSuccess(session)
  }

  const handleQuickLogin = (targetRole: UserRole) => {
    const session = targetRole === 'admin' ? DEFAULT_ADMIN_USER : DEFAULT_CUSTOMER_USER
    handleSelectSession(session)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please provide an email and password.')
      return
    }

    if (role === 'admin' && !email.toLowerCase().includes('admin') && email !== 'admin@carrytote.in') {
      setError('Admin access requires an authorized @carrytote.in studio account.')
      return
    }

    const session: UserSession = {
      id: `u-${Date.now().toString(36)}`,
      email,
      fullName: fullName || (role === 'admin' ? 'Master Craftsman' : 'Bespoke Client'),
      role,
      title: role === 'admin' ? 'Workshop Craftsman' : 'Bespoke Patron',
    }

    saveSession(session)
    onSuccess(session)
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-brand-header">
          <div className="login-mark">SN</div>
          <div>
            <h2>Atelier N°07 Access</h2>
            <p>Carry Bespoke Leather Goods · Role Authentication</p>
          </div>
        </div>

        {/* Role Differentiation Selector */}
        <div className="role-tabs" role="tablist">
          <button
            type="button"
            className={`role-tab-btn ${role === 'customer' ? 'active' : ''}`}
            onClick={() => {
              setRole('customer')
              setError('')
            }}
          >
            <span>🛍️ Bespoke Patron</span>
            <span className="tab-badge">Customer</span>
          </button>

          <button
            type="button"
            className={`role-tab-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setRole('admin')
              setError('')
            }}
          >
            <span>⚙️ Atelier Master</span>
            <span className="tab-badge">Admin</span>
          </button>
        </div>

        {/* Instant 1-Click Fast Access Strip */}
        <div className="quick-login-box">
          <div className="quick-login-header">
            <span>⚡ Instant Demo Access</span>
            <small style={{ color: '#8c8275' }}>No typing required</small>
          </div>

          {role === 'admin' ? (
            <button
              type="button"
              className="quick-btn"
              onClick={() => handleSelectSession(DEFAULT_ADMIN_USER)}
            >
              <div>
                <b>Log in as Master Craftsman</b>
                <small style={{ display: 'block', color: '#9c9285', fontSize: '10.5px' }}>
                  admin@carrytote.in · Head of Bespoke Workshop (Full Admin &amp; Stock Access)
                </small>
              </div>
              <span>Enter Hub →</span>
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {DEMO_CUSTOMERS.map((cust) => (
                <button
                  key={cust.id}
                  type="button"
                  className="quick-btn"
                  onClick={() => handleSelectSession(cust)}
                >
                  <div>
                    <b>{cust.fullName}</b>
                    <small style={{ display: 'block', color: '#9c9285', fontSize: '10.5px' }}>
                      {cust.email} · {cust.title}
                    </small>
                  </div>
                  <span>Select Patron →</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Traditional Credentials Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {isRegistering && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Vikram Malhotra"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label>Studio Email</label>
            <input
              type="email"
              placeholder={role === 'admin' ? 'admin@carrytote.in' : 'client@example.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="submit-auth-btn">
            {isRegistering ? 'Create Atelier Account →' : `Sign in as ${role === 'admin' ? 'Artisan Admin' : 'Customer'} →`}
          </button>
        </form>

        <div className="guest-link-row">
          <button
            type="button"
            className="guest-btn"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Already have an account? Sign In' : 'New patron? Register for consultations'}
          </button>

          {onCancel && (
            <button
              type="button"
              className="guest-btn"
              onClick={onCancel}
              style={{ color: '#8c8275' }}
            >
              Continue as Guest ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
