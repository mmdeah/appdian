import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/client'
import { supabase } from '../api/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('appdian_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('appdian_token')
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(({ data }) => {
        const userData = data.rol === 'PROFESIONAL'
          ? { ...data.profesional, rol: 'PROFESIONAL' }
          : { ...data.empresa, rol: 'EMPRESA' }
        setUser(userData)
        localStorage.setItem('appdian_user', JSON.stringify(userData))
      })
      .catch(() => {
        localStorage.removeItem('appdian_token')
        localStorage.removeItem('appdian_user')
      })
      .finally(() => setLoading(false))
  }, [])

  // Email/password login — works for both empresas and profesionales
  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password)
    localStorage.setItem('appdian_token', data.token)
    const userData = data.rol === 'PROFESIONAL'
      ? { ...data.profesional, rol: 'PROFESIONAL' }
      : { ...data.empresa, rol: 'EMPRESA' }
    localStorage.setItem('appdian_user', JSON.stringify(userData))
    setUser(userData)
    return data
  }, [])

  // Called by AuthCallback after email confirmation — stores token + user
  const setUserFromData = useCallback((data) => {
    const userData = { ...data.empresa, rol: 'EMPRESA' }
    localStorage.setItem('appdian_token', data.token)
    localStorage.setItem('appdian_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {})
    localStorage.removeItem('appdian_token')
    localStorage.removeItem('appdian_user')
    setUser(null)
  }, [])

  // Helpers derivados
  const empresa     = user?.rol === 'EMPRESA'      ? user : null
  const profesional = user?.rol === 'PROFESIONAL'  ? user : null
  const rol         = user?.rol || null
  const isAuth      = !!user

  return (
    <AuthContext.Provider value={{
      user, empresa, profesional, rol, isAuth, loading,
      login, setUserFromData, logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
