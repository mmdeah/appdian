import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../api/supabase'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import './Login.css'

export default function RecuperarPassword() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/auth/callback`
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (err) throw err
      setEnviado(true)
    } catch (err) {
      setError(err.message || 'Error al enviar el correo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="brand-logo-mark">A</div>
          <h2 className="brand-title">Konta</h2>
          <p className="brand-tagline">Facturación electrónica<br />para Colombia — DIAN</p>
        </div>
        <div className="brand-geo" aria-hidden="true">
          <div className="geo-ring geo-ring-1" />
          <div className="geo-ring geo-ring-2" />
          <div className="geo-ring geo-ring-3" />
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-form-card fade-up">
          {enviado ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
              <h1 className="login-heading">Revisa tu correo</h1>
              <p className="muted" style={{ marginBottom: '24px', lineHeight: 1.6 }}>
                Enviamos un enlace de recuperación a <strong>{email}</strong>.
                <br />Haz clic en él para elegir una nueva contraseña.
              </p>
              <p className="muted t-xs" style={{ marginBottom: '16px' }}>
                Si no lo ves, revisa la carpeta de spam.
              </p>
              <Link to="/login" className="login-link" style={{ fontSize: '14px' }}>
                Volver al login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="login-heading">Recuperar contraseña</h1>
              <p className="login-sub muted">
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </p>
              <form onSubmit={handleSubmit} className="login-form">
                <Input
                  label="Correo electrónico"
                  type="email"
                  placeholder="empresa@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
                {error && (
                  <div className="login-error">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                  </div>
                )}
                <Button type="submit" loading={loading} fullWidth size="lg">
                  Enviar enlace
                </Button>
              </form>
              <p className="login-footer muted t-xs">
                <Link to="/login" className="login-link">Volver al login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
