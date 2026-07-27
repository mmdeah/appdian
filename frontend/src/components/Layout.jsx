import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import './Layout.css'

const TITLES = {
  '/dashboard':    'Dashboard',
  '/pos':          'Punto de Venta',
  '/facturas':     'Historial de Facturas',
  '/productos':    'Productos',
  '/clientes':     'Clientes',
  '/estadisticas': 'Estadísticas & Contabilidad',
  '/consultas':    'Mis Consultas',
  '/nomina':       'Nómina',
  '/gastos':       'Control de Gastos',
  '/caja-diaria':  'Caja Diaria',
  '/inventario':   'Inventario',
  '/proyecciones': 'Proyecciones Tributarias',
}

export default function Layout() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const title = TITLES[pathname] || 'Konta'
  const esVisor = !!sessionStorage.getItem('visor_token')
  const [menuOpen, setMenuOpen] = useState(false)

  // Cerrar el menú móvil al navegar a otra vista
  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
      <div className="main-content">
        {esVisor && (
          <div className="visor-banner">
            <div className="visor-banner-info">
              <span className="visor-eye">👁</span>
              <span>Vista profesional —</span>
              <strong>{user?.nombre || user?.email || 'Empresa'}</strong>
              <span className="visor-badge">Solo lectura</span>
            </div>
            <button className="visor-close" onClick={() => window.close()}>
              ✕ Cerrar pestaña
            </button>
          </div>
        )}
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMenuOpen(o => !o)} aria-label="Abrir menú">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="topbar-title">{title}</h1>
          <div className="topbar-right">
            <span className="t-xs muted caps topbar-tag">Colombia · DIAN</span>
            <div className="status-dot" title="Sistema operativo" />
          </div>
        </header>
        <main className="page-body fade-up">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
