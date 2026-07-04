import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { invoicesApi, vencimientosApi, statsApi } from '../api/client'
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
    v.dias_restantes < 0  ? `Venció hace ${Math.abs(v.dias_restantes)} día${Math.abs(v.dias_restantes)!==1?'s':''}` :
    v.dias_restantes === 0 ? 'Vence hoy' :
    v.dias_restantes === 1 ? 'Vence mañana' :
    `${v.dias_restantes} días`

  return (
    <div className={`venc-chip ${urgClass}`}>
      <span className="venc-emoji">{v.emoji}</span>
      <div className="venc-info">
        <p className="venc-label">{v.label}</p>
        <p className="venc-fecha">{new Date(v.fecha+'T12:00:00').toLocaleDateString('es-CO',{ day:'2-digit', month:'short', year:'numeric' })}</p>
      </div>
      <span className="venc-dias">{diasLabel}</span>
    </div>
  )
}

// ── Chips por modo ──────────────────────────────────────────────────────────
const CHIPS_DATOS = [
  '¿Cuánto vendí hoy?',
  '¿Tengo facturas por cobrar?',
  '¿Cómo van mis ventas este mes?',
]
const CHIPS_GENERAL = [
  '¿Cuándo vence el IVA?',
  '¿Qué es retención en la fuente?',
  '¿Cómo calculo la nómina?',
]

// ── Mini Bot ────────────────────────────────────────────────────────────────
function MiniBot({ dashData }) {
  const navigate   = useNavigate()
  const [tab,      setTab]      = useState('datos')   // 'datos' | 'general'
  const [texto,    setTexto]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [resp,     setResp]     = useState(null)
  const [tipoResp, setTipoResp] = useState('datos')

  const esDatos = tab === 'datos'

  async function enviar(preg) {
    const q = preg || texto
    if (!q.trim() || loading) return
    setTexto('')
    setLoading(true); setResp(null); setTipoResp(tab)
    try {
      if (esDatos) {
        const hoy = new Date().toISOString().split('T')[0]
        const ctx = {
          periodo       : { desde: hoy, hasta: hoy },
          ventas_hoy    : dashData?.total_ventas,
          facturas_hoy  : dashData?.num_facturas,
          ventas_mes    : dashData?.ventas_mes,
          por_cobrar    : dashData?.por_cobrar,
          aprobadas_hoy : dashData?.aprobadas,
        }
        const { data } = await statsApi.ai({ pregunta: q, contexto: ctx })
        setResp(data.respuesta)
      } else {
        const { data } = await statsApi.chatGeneral({ pregunta: q })
        setResp(data.respuesta)
      }
    } catch (e) {
      setResp(`⚠️ ${e.response?.data?.error || 'Error al consultar. Verifica OPENROUTER_API_KEY.'}`)
    } finally { setLoading(false) }
  }

  // Texto plano de la respuesta (sin markdown complejo)
  const textoResp = resp
    ? resp.replace(/#{1,3}\s/g,'').replace(/\*\*/g,'').replace(/\*/g,'').replace(/---/g,'').slice(0,600)
    : null

  return (
    <div className="minibot-shell">
      <div className="minibot-head">
        <p className="minibot-titulo">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            <circle cx="8.5" cy="14.5" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
          Asistente IA
        </p>
        <div className="minibot-tabs">
          <button
            className={`minibot-tab minibot-tab--datos ${tab==='datos' ? 'minibot-tab--on':''}`}
            onClick={() => { setTab('datos'); setResp(null) }}
          >
            📊 Mis datos
          </button>
          <button
            className={`minibot-tab minibot-tab--general ${tab==='general' ? 'minibot-tab--on':''}`}
            onClick={() => { setTab('general'); setResp(null) }}
          >
            💬 General
          </button>
        </div>
      </div>

      <div className="minibot-body">
        {/* Descripción del modo */}
        <p style={{ fontSize:12, color:'var(--text-muted)', margin:0 }}>
          {esDatos
            ? '🔒 Accede a tus datos reales — ventas de hoy, cartera y más'
            : '📚 Sin acceso a tus datos — normativa, IVA, nómina, DIAN'}
        </p>

        {/* Chips de sugerencia */}
        <div className="minibot-chips">
          {(esDatos ? CHIPS_DATOS : CHIPS_GENERAL).map(c => (
            <button
              key={c}
              className={`minibot-chip minibot-chip--${tab}`}
              onClick={() => enviar(c)}
              disabled={loading}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Input + send */}
        <div className="minibot-input-row">
          <input
            className={`minibot-input ${esDatos ? '' : 'minibot-input--general'}`}
            placeholder={esDatos ? 'Pregunta sobre tus finanzas…' : 'Pregunta sobre contabilidad…'}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter') enviar() }}
            disabled={loading}
          />
          <button
            className={`minibot-send ${esDatos ? '' : 'minibot-send--general'}`}
            onClick={() => enviar()}
            disabled={loading || !texto.trim()}
          >
            {loading ? '…' : 'Enviar'}
          </button>
        </div>

        {/* Respuesta compacta */}
        {textoResp && (
          <div className={`minibot-resp minibot-resp--${tipoResp}`}>
            <p className={`minibot-resp-label minibot-resp-label--${tipoResp}`}>
              {tipoResp==='datos' ? '📊 Análisis de tus datos' : '💬 Consultor general'}
            </p>
            {textoResp}{resp.length > 600 ? '…' : ''}
          </div>
        )}

        {/* Ver análisis completo */}
        <button className="minibot-ver-mas" onClick={() => navigate('/estadisticas')}>
          Ver análisis completo en Estadísticas →
        </button>
      </div>
    </div>
  )
}

// ── Dashboard principal ─────────────────────────────────────────────────────
export default function Dashboard() {
  const { empresa } = useAuth()
  const navigate    = useNavigate()
  const [data,        setData]       = useState(null)
  const [loading,     setLoading]    = useState(true)
  const [error,       setError]      = useState('')
  const [vencimientos,setVenc]       = useState([])
  const [loadingVenc, setLoadingVenc]= useState(true)

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

  const today = new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' })
  const vencProximos = vencimientos.filter(v => v.dias_restantes <= 30)
  const hayAlertas   = vencProximos.some(v => ['VENCIDA','CRITICA','ALTA'].includes(v.urgencia))

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
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nueva venta POS
        </Button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="dash-loading"><div className="spinner"/></div>
      ) : error ? (
        <div className="dash-error">{error}</div>
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              label="Ventas hoy" value={COP(data?.total_ventas)}
              sub={`${data?.num_facturas||0} transacciones`} color="accent"
              icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
            />
            <StatCard
              label="Ventas del mes" value={COP(data?.ventas_mes)}
              sub={new Date().toLocaleDateString('es-CO',{ month:'long', year:'numeric' })} color="info"
              icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
            />
            <StatCard
              label="Por cobrar" value={COP(data?.por_cobrar)}
              sub="Facturas FE pendientes de pago"
              color={data?.por_cobrar > 0 ? 'danger' : 'success'}
              icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4"/></svg>}
            />
            <StatCard
              label="Aprobadas DIAN" value={data?.aprobadas ?? 0}
              sub="Hoy" color="success"
              icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>}
            />
          </div>

          {/* Quick actions */}
          <div className="dash-section">
            <p className="caps muted" style={{ marginBottom:'var(--s-4)' }}>Acciones rápidas</p>
            <div className="quick-actions">
              {[
                { label:'Venta POS',    desc:'Emite un documento POS',       to:'/pos',          color:'accent'  },
                { label:'Ver facturas', desc:'Historial completo',            to:'/facturas',     color:'info'    },
                { label:'Proyecciones', desc:'Estimaciones tributarias',      to:'/proyecciones', color:'success' },
                { label:'Mis Consultas',desc:'Soporte con expertos',          to:'/consultas',    color:'warning' },
              ].map((a) => (
                <button key={a.to} className={`quick-card quick-card--${a.color}`} onClick={() => navigate(a.to)}>
                  <p className="quick-label">{a.label}</p>
                  <p className="quick-desc muted t-xs">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Mini Bot ── */}
          <div className="dash-section">
            <MiniBot dashData={data} />
          </div>

          {/* Vencimientos */}
          <div className="dash-section">
            <div className="venc-header">
              <p className="caps muted">Próximos vencimientos tributarios</p>
              {hayAlertas && <span className="venc-alerta-dot"/>}
              <button className="venc-ver-mas" onClick={() => navigate('/proyecciones')}>Ver proyecciones →</button>
            </div>
            {loadingVenc ? (
              <div className="venc-loading"><div className="spinner"/></div>
            ) : vencProximos.length === 0 ? (
              <div className="venc-empty">✅ Sin vencimientos en los próximos 30 días</div>
            ) : (
              <div className="venc-lista">
                {vencProximos.map((v,i) => <VencimientoChip key={i} v={v}/>)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
