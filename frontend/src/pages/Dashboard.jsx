import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { invoicesApi, vencimientosApi } from '../api/client'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import './Dashboard.css'

function StatCard({ label, value, sub, icon, color = 'accent' }) {
  return (
    <div className="stat-card card">
      <div className={`stat-icon stat-icon--${color}`}>{icon}</div>
      <div className="stat-body">
        <p className="stat-label caps muted">{label}</p>
        <p className="stat-value">{value ?? '—'}</p>
        {sub && <p className="stat-sub muted t-xs">{sub}</p>}
      </div>
    </div>
  )
}

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

function VencimientoChip({ v }) {
  const urgClass =
    v.urgencia === 'VENCIDA'  ? 'venc-chip--vencida' :
    v.urgencia === 'CRITICA'  ? 'venc-chip--critica' :
    v.urgencia === 'ALTA'     ? 'venc-chip--alta'    :
    v.urgencia === 'MEDIA'    ? 'venc-chip--media'   : 'venc-chip--baja'

  const diasLabel =
    v.dias_restantes < 0  ? `Venció hace ${Math.abs(v.dias_restantes)} día${Math.abs(v.dias_restantes) !== 1 ? 's' : ''}` :
    v.dias_restantes === 0 ? 'Vence hoy' :
    v.dias_restantes === 1 ? 'Vence mañana' :
    `${v.dias_restantes} días`

  return (
    <div className={`venc-chip ${urgClass}`}>
      <span className="venc-emoji">{v.emoji}</span>
      <div className="venc-info">
        <p className="venc-label">{v.label}</p>
        <p className="venc-fecha">{new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
      </div>
      <span className="venc-dias">{diasLabel}</span>
    </div>
  )
}

export default function Dashboard() {
  const { empresa } = useAuth()
  const navigate = useNavigate()
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [vencimientos, setVenc]   = useState([])
  const [loadingVenc, setLoadingVenc] = useState(true)

  useEffect(() => {
    invoicesApi.dashboard()
      .then(({ data }) => setData(data))
      .catch(() => setError('No se pudo cargar el dashboard'))
      .finally(() => setLoading(false))

    vencimientosApi.listar()
      .then(({ data }) => setVenc(data.vencimientos || []))
      .catch(() => {})
      .finally(() => setLoadingVenc(false))
  }, [])

  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  // Solo muestra los próximos 30 días en el widget del dashboard
  const vencProximos = vencimientos.filter(v => v.dias_restantes <= 30)
  const hayAlertas = vencProximos.some(v => ['VENCIDA','CRITICA','ALTA'].includes(v.urgencia))

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h2 className="dash-greeting">Buenos días, {empresa?.nombre?.split(' ')[0]} 👋</h2>
          <p className="dash-date muted t-sm">{today}</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/pos')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva venta POS
        </Button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="dash-loading"><div className="spinner" /></div>
      ) : error ? (
        <div className="dash-error">{error}</div>
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              label="Ventas hoy"
              value={COP(data?.total_ventas)}
              sub={`${data?.num_facturas || 0} transacciones`}
              color="accent"
              icon={
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              }
            />
            <StatCard
              label="Ventas del mes"
              value={COP(data?.ventas_mes)}
              sub={new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
              color="info"
              icon={
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
            <StatCard
              label="Por cobrar"
              value={COP(data?.por_cobrar)}
              sub="Facturas FE pendientes de pago"
              color={data?.por_cobrar > 0 ? 'danger' : 'success'}
              icon={
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" />
                </svg>
              }
            />
            <StatCard
              label="Aprobadas DIAN"
              value={data?.aprobadas ?? 0}
              sub="Hoy"
              color="success"
              icon={
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              }
            />
          </div>

          {/* Quick actions */}
          <div className="dash-section">
            <p className="caps muted" style={{ marginBottom: 'var(--s-4)' }}>Acciones rápidas</p>
            <div className="quick-actions">
              {[
                { label: 'Venta POS',    desc: 'Emite un documento POS', to: '/pos',          color: 'accent' },
                { label: 'Ver facturas', desc: 'Historial completo',      to: '/facturas',     color: 'info' },
                { label: 'Proyecciones', desc: 'Estimaciones tributarias', to: '/proyecciones', color: 'success' },
                { label: 'Mis Consultas',desc: 'Soporte con expertos',    to: '/consultas',    color: 'warning' },
              ].map((a) => (
                <button key={a.to} className={`quick-card quick-card--${a.color}`} onClick={() => navigate(a.to)}>
                  <p className="quick-label">{a.label}</p>
                  <p className="quick-desc muted t-xs">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Vencimientos */}
          <div className="dash-section">
            <div className="venc-header">
              <p className="caps muted">Próximos vencimientos tributarios</p>
              {hayAlertas && <span className="venc-alerta-dot" />}
              <button className="venc-ver-mas" onClick={() => navigate('/proyecciones')}>
                Ver proyecciones →
              </button>
            </div>
            {loadingVenc ? (
              <div className="venc-loading"><div className="spinner" /></div>
            ) : vencProximos.length === 0 ? (
              <div className="venc-empty">✅ Sin vencimientos en los próximos 30 días</div>
            ) : (
              <div className="venc-lista">
                {vencProximos.map((v, i) => <VencimientoChip key={i} v={v} />)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
