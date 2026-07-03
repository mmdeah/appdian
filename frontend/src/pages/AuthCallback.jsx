import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabase'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import './AuthCallback.css'

export default function AuthCallback() {
  const navigate  = useNavigate()
  const { setUserFromData } = useAuth()
  const [tipo,    setTipo]    = useState(null)   // 'signup' | 'recovery' | null
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(true)

  // Formulario de nueva contraseña (solo recovery)
  const [token,    setToken]    = useState('')
  const [pw,       setPw]       = useState('')
  const [pw2,      setPw2]      = useState('')
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(false)

  useEffect(() => {
    async function handleCallback() {
      try {
        // Supabase resuelve automáticamente el hash de la URL
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setError('El enlace expiró o ya fue usado. Intenta de nuevo.')
          setLoading(false)
          return
        }

        // Detectar tipo desde el hash de la URL
        const hashParams = new URLSearchParams(window.location.hash.slice(1))
        const type = hashParams.get('type') || session.user?.app_metadata?.type || 'signup'

        setTipo(type)
        setToken(session.access_token)

        if (type === 'recovery') {
          // Mostrar formulario de nueva contraseña
          setLoading(false)
          return
        }

        // type === 'signup' → confirmar email y obtener JWT
        const { data } = await authApi.confirmarEmail(session.access_token)
        localStorage.setItem('appdian_token', data.token)
        localStorage.setItem('appdian_user', JSON.stringify({ ...data.empresa, rol: 'EMPRESA' }))
        setUserFromData(data)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        setError(err.response?.data?.error || 'Error al procesar el enlace')
        setLoading(false)
      }
    }

    handleCallback()
  }, [])

  async function handleNuevaPassword(e) {
    e.preventDefault()
    if (pw !== pw2) { setError('Las contraseñas no coinciden'); return }
    if (pw.length < 8) { setError('Mínimo 8 caracteres'); return }
    setSaving(true); setError('')
    try {
      await authApi.actualizarPassword(token, pw)
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar la contraseña')
    } finally { setSaving(false) }
  }

  // ── Estado de carga ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="callback-page">
        <div className="callback-loading">
          <div className="callback-spinner" />
          <p>Verificando enlace…</p>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && tipo !== 'recovery') {
    return (
      <div className="callback-page">
        <div className="callback-error">
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>{error}</p>
          <button className="callback-retry" onClick={() => navigate('/login')}>
            Volver al login
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario nueva contraseña ───────────────────────────────────────────
  if (tipo === 'recovery') {
    if (success) {
      return (
        <div className="callback-page">
          <div className="callback-loading">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <p style={{ fontWeight: 700, marginBottom: '8px' }}>¡Contraseña actualizada!</p>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Redirigiendo al login…</p>
          </div>
        </div>
      )
    }

    return (
      <div className="callback-page">
        <div className="callback-form-card">
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Nueva contraseña</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
            Elige una nueva contraseña para tu cuenta.
          </p>
          <form onSubmit={handleNuevaPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Input
              label="Nueva contraseña (mín. 8 caracteres)"
              type="password"
              placeholder="••••••••"
              value={pw}
              onChange={e => setPw(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="••••••••"
              value={pw2}
              onChange={e => setPw2(e.target.value)}
              required
            />
            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#991b1b', fontSize: 13 }}>
                {error}
              </div>
            )}
            <Button type="submit" loading={saving} fullWidth size="lg">
              Guardar contraseña
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return null
}
