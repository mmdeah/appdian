import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/client'

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

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password)
    localStorage.setItem('appdian_token', data.token)
    localStorage.setItem('appdian_empresa', JSON.stringify(data.empresa))
    setEmpresa(data.empresa)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('appdian_token')
    localStorage.removeItem('appdian_empresa')
    setEmpresa(null)
  }, [])

  return (
    <AuthContext.Provider value={{ empresa, login, logout, loading, isAuth: !!empresa }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
