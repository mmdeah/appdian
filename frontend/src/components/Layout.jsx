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

  return (
    <div className="app-shell">
      <Sidebar />
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
          <h1 className="topbar-title">{title}</h1>
          <div className="topbar-right">
            <span className="t-xs muted caps">Colombia · DIAN</span>
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
