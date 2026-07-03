import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import './Register.css'

const EMPTY = {
  nombre_empresa: '',
  nit: '',
  email: '',
  password: '',
  confirmar: '',
  telefono: '',
  direccion: '',
}

export default function Register() {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const { data } = await authApi.register({
        nombre_empresa: form.nombre_empresa,
        nit: form.nit,
        email: form.email,
        password: form.password,
        telefono: form.telefono,
        direccion: form.direccion,
      })
      // Store token and redirect
      localStorage.setItem('appdian_token', data.token)
      localStorage.setItem('appdian_user', JSON.stringify({ ...data.empresa, rol: 'EMPRESA' }))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    try {
      await loginWithGoogle()
      // Browser redirects — no further code runs here
    } catch (err) {
      setError('Error al conectar con Google')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="register-page">
      {/* Brand panel */}
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="brand-logo-mark">A</div>
          <h2 className="brand-title">AppDian</h2>
          <p className="brand-tagline">Facturación electrónica<br />para Colombia — DIAN</p>
          <div className="brand-features">
            {['Gratis hasta tu primer cliente real', 'POS + Factura electrónica DIAN', 'Desplegado en la nube, siempre activo'].map((f) => (
              <div key={f} className="brand-feature">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="brand-geo" aria-hidden="true">
          <div className="geo-ring geo-ring-1" />
          <div className="geo-ring geo-ring-2" />
          <div className="geo-ring geo-ring-3" />
        </div>
      </div>

      {/* Form panel */}
      <div className="register-form-panel">
        <div className="register-form-card fade-up">
          <h1 className="login-heading">Crear cuenta</h1>
          <p className="login-sub muted">Registra tu empresa para comenzar</p>

          {/* Google button */}
          <button className="google-btn" onClick={handleGoogle} disabled={googleLoading} type="button">
            {googleLoading ? (
              <span className="google-spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )}
            Continuar con Google
          </button>

          <div className="divider-text"><span>o con email</span></div>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-row">
              <Input
                label="Nombre de la empresa *"
                value={form.nombre_empresa}
                onChange={set('nombre_empresa')}
                placeholder="Mi Empresa S.A.S."
                required
              />
              <Input
                label="NIT *"
                value={form.nit}
                onChange={set('nit')}
                placeholder="900123456-1"
                required
              />
            </div>
            <Input
              label="Correo electrónico *"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="empresa@email.com"
              required
              autoComplete="email"
            />
            <div className="form-row">
              <Input
                label="Contraseña *"
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
              <Input
                label="Confirmar contraseña *"
                type="password"
                value={form.confirmar}
                onChange={set('confirmar')}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="form-row">
              <Input
                label="Teléfono"
                value={form.telefono}
                onChange={set('telefono')}
                placeholder="3001234567"
              />
              <Input
                label="Dirección"
                value={form.direccion}
                onChange={set('direccion')}
                placeholder="Calle 123 #45-67"
              />
            </div>

            {error && (
              <div className="login-error">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} fullWidth size="lg">
              Crear cuenta
            </Button>
          </form>

          <p className="login-footer muted t-xs">
            ¿Ya tienes cuenta?&nbsp;
            <Link to="/login" className="login-link">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
