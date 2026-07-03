import { useEffect } from 'react'

// Página de entrada al modo visor profesional.
// Recibe el token temporal en el hash de la URL (#TOKEN), lo guarda en
// sessionStorage (tab-specific), luego hace un full-reload a /dashboard.
// Así el AuthContext arranca limpio con el visor_token y toda la app
// funciona exactamente igual que para la empresa real.
export default function VistaEmpresaPro() {
  useEffect(() => {
    const token = window.location.hash.slice(1)
    if (token) {
      sessionStorage.setItem('visor_token', token)
    }
    // Hard reload para que AuthContext arranque con el visor_token
    window.location.replace('/dashboard')
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)',
      flexDirection: 'column', gap: '16px',
    }}>
      <div style={{
        width: 36, height: 36,
        border: '3px solid var(--border-mid)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin .7s linear infinite',
      }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cargando vista de empresa…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
