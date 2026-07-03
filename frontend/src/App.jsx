import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Products from './pages/Products'
import Customers from './pages/Customers'
import Invoices from './pages/Invoices'
import Stats from './pages/Stats'
import Consultas from './pages/Consultas'
import Proyecciones from './pages/Proyecciones'
import ProfesionalLayout from './components/ProfesionalLayout'
import ProfesionalPanel from './pages/ProfesionalPanel'
import ProfesionalTicket from './pages/ProfesionalTicket'
import ProfesionalAudit from './pages/ProfesionalAudit'
import Nomina from './pages/Nomina'
import NominaLiquidacion from './pages/NominaLiquidacion'
import NominaColilla from './pages/NominaColilla'
import Gastos from './pages/Gastos'
import StatsReporte from './pages/StatsReporte'

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spinner" />
    </div>
  )
}

function PrivateRoute({ children, onlyRol }) {
  const { isAuth, loading, rol } = useAuth()
  if (loading) return <Spinner />
  if (!isAuth) return <Navigate to="/login" replace />
  if (onlyRol && rol !== onlyRol) {
    return <Navigate to={rol === 'PROFESIONAL' ? '/panel' : '/dashboard'} replace />
  }
  return children
}

function PublicRoute({ children }) {
  const { isAuth, loading, rol } = useAuth()
  if (loading) return null
  if (isAuth) return <Navigate to={rol === 'PROFESIONAL' ? '/panel' : '/dashboard'} replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login"          element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/registro"       element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/auth/callback"  element={<AuthCallback />} />

          {/* Rutas de empresa */}
          <Route path="/" element={<PrivateRoute onlyRol="EMPRESA"><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="pos"          element={<POS />} />
            <Route path="productos"    element={<Products />} />
            <Route path="clientes"     element={<Customers />} />
            <Route path="facturas"     element={<Invoices />} />
            <Route path="estadisticas" element={<Stats />} />
            <Route path="consultas"     element={<Consultas />} />
            <Route path="proyecciones" element={<Proyecciones />} />
            <Route path="nomina"                     element={<Nomina />} />
            <Route path="nomina/liquidacion/:id"     element={<NominaLiquidacion />} />
            <Route path="nomina/colilla/:id"         element={<NominaColilla />} />
            <Route path="gastos"                     element={<Gastos />} />
            <Route path="estadisticas/reporte"       element={<StatsReporte />} />
          </Route>

          {/* Rutas de profesionales (contadores/abogados) */}
          <Route path="/panel" element={<PrivateRoute onlyRol="PROFESIONAL"><ProfesionalLayout /></PrivateRoute>}>
            <Route index element={<ProfesionalPanel />} />
            <Route path="ticket/:id"  element={<ProfesionalTicket />} />
            <Route path="auditoria"   element={<ProfesionalAudit />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
