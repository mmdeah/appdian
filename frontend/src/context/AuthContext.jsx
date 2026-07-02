import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/client'
import { supabase } from '../api/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [empresa, setEmpresa] = useState(() => {
    try { return JSON.parse(localStorage.getItem('appdian_empresa')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('appdian_token')
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(({ data }) => setEmpresa(data.empresa))
      .catch(() => {
        localStorage.removeItem('appdian_token')
        localStorage.removeItem('appdian_empresa')
      })
      .finally(() => setLoading(false))
  }, [])

  // Email/password login
  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password)
    localStorage.setItem('appdian_token', data.token)
    localStorage.setItem('appdian_empresa', JSON.stringify(data.empresa))
    setEmpresa(data.empresa)
    return data
  }, [])

  // Exchange a Supabase access_token for our app JWT (used after Google OAuth)
  const loginWithToken = useCallback(async (supabaseAccessToken) => {
    const { data } = await authApi.googleAuth(supabaseAccessToken)
    localStorage.setItem('appdian_token', data.token)
    localStorage.setItem('appdian_empresa', JSON.stringify(data.empresa))
    setEmpresa(data.empresa)
    return data
  }, [])

  // Trigger Google OAuth — redirects the browser to Google
  const loginWithGoogle = useCallback(async () => {
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {})
    localStorage.removeItem('appdian_token')
    localStorage.removeItem('appdian_empresa')
    setEmpresa(null)
  }, [])

  return (
    <AuthContext.Provider value={{ empresa, login, loginWithToken, loginWithGoogle, logout, loading, isAuth: !!empresa }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
