import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './ProfesionalLayout.css'

export default function ProfesionalLayout() {
  const { profesional, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() { logout(); navigate('/login') }

  const initials = profesional?.nombre
    ? profesional.nombre.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()
    : 'P'

  const especialidadColor = { CONTADOR: '#0ea5e9', ABOGADO: '#8b5cf6', ADMIN: '#f59e0b' }

  return (
    <div className="pro-shell">
      {/* Sidebar profesional */}
      <aside className="pro-sidebar">
        <div className="pro-logo">
          <div className="logo-mark">A</div>
          <div>
            <span className="logo-text">AppDian</span>
            <span className="pro-tag">Panel Profesional</span>
          </div>
        </div>

        <div className="pro-perfil">
          <div className="pro-avatar" style={{ background: especialidadColor[profesional?.especialidad] || '#6366f1' }}>
            {initials}
          </div>
          <div>
            <p className="pro-nombre">{profesional?.nombre}</p>
            <p className="pro-especialidad">{profesional?.especialidad}</p>
          </div>
        </div>

        <div className="pro-divider" />

        <nav className="pro-nav">
          <NavLink to="/panel" end className={({ isActive }) => `pro-nav-item ${isActive ? 'pro-nav-active' : ''}`}>
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              <path d="M9 12h6M9 16h4" />
            </svg>
            Tickets
          </NavLink>
          <NavLink to="/panel/auditoria" className={({ isActive }) => `pro-nav-item ${isActive ? 'pro-nav-active' : ''}`}>
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              <path d="M9 12h6M9 16h4" />
              <circle cx="19" cy="19" r="3" fill="currentColor" stroke="none" />
            </svg>
            Auditoría
          </NavLink>
        </nav>

        <div className="pro-footer">
          <button className="pro-logout" onClick={handleLogout}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="pro-main">
        <Outlet />
      </main>
    </div>
  )
}
