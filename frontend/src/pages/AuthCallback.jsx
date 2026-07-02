import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabase'
import { useAuth } from '../context/AuthContext'
import './AuthCallback.css'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { loginWithToken } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      try {
        // Supabase resuelve la sesión desde la URL (hash o query params)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setError('No se pudo obtener la sesión de Google. Intenta de nuevo.')
          return
        }

        // Intercambiar el token de Supabase por nuestro JWT
        await loginWithToken(session.access_token)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        setError(err.response?.data?.error || 'Error al autenticar con Google')
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="callback-page">
      {error ? (
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
      ) : (
        <div className="callback-loading">
          <div className="callback-spinner" />
          <p>Autenticando con Google...</p>
        </div>
      )}
    </div>
  )
}
