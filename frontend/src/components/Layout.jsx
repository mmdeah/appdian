import { Outlet, useLocation } from 'react-router-dom'
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
}

export default function Layout() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] || 'AppDian'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
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
