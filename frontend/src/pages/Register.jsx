import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmar) return setError('Las contraseñas no coinciden')
    if (form.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres')

    setLoading(true)
    try {
      const { data } = await authApi.register({
        nombre_empresa: form.nombre_empresa,
        nit:       form.nit,
        email:     form.email,
        password:  form.password,
        telefono:  form.telefono,
        direccion: form.direccion,
      })
      localStorage.setItem('appdian_token', data.token)
      localStorage.setItem('appdian_user', JSON.stringify({ ...data.empresa, rol: 'EMPRESA' }))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  // ── Formulario de registro ─────────────────────────────────────────────────
  return (
    <div className="register-page">
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="brand-logo-mark">A</div>
          <h2 className="brand-title">Konta</h2>
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

      <div className="register-form-panel">
        <div className="register-form-card fade-up">
          <h1 className="login-heading">Crear cuenta</h1>
          <p className="login-sub muted">Registra tu empresa para comenzar</p>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-row">
              <Input label="Nombre de la empresa *" value={form.nombre_empresa} onChange={set('nombre_empresa')} placeholder="Mi Empresa S.A.S." required />
              <Input label="NIT *" value={form.nit} onChange={set('nit')} placeholder="900123456-1" required />
            </div>
            <Input label="Correo electrónico *" type="email" value={form.email} onChange={set('email')} placeholder="empresa@email.com" required autoComplete="email" />
            <div className="form-row">
              <Input label="Contraseña * (mín. 8 caracteres)" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required autoComplete="new-password" />
              <Input label="Confirmar contraseña *" type="password" value={form.confirmar} onChange={set('confirmar')} placeholder="••••••••" required />
            </div>
            <div className="form-row">
              <Input label="Teléfono" value={form.telefono} onChange={set('telefono')} placeholder="3001234567" />
              <Input label="Dirección" value={form.direccion} onChange={set('direccion')} placeholder="Calle 123 #45-67" />
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
