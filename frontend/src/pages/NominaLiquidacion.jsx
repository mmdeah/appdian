import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { nominaApi } from '../api/client'
import './Nomina.css'

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const ESTADO_SIGUIENTE = { BORRADOR: 'PROCESADA', PROCESADA: 'PAGADA' }
const ESTADO_COLOR     = { BORRADOR: 'neutral', PROCESADA: 'warning', PAGADA: 'success' }

function periodoLabel(p) {
  if (!p) return ''
  const [y, m] = p.split('-')
  return new Date(y, m - 1, 1).toLocaleString('es-CO', { month: 'long', year: 'numeric' })
}

export default function NominaLiquidacion() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [liq, setLiq]             = useState(null)
  const [loading, setLoading]     = useState(true)
  const [cambiando, setCambiando] = useState(false)

  async function cargar() {
    const { data } = await nominaApi.obtenerLiquidacion(id)
    setLiq(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [id])

  async function avanzarEstado() {
    const siguiente = ESTADO_SIGUIENTE[liq.estado]
    if (!siguiente) return
    if (!confirm(`¿Marcar como "${siguiente}"?`)) return
    setCambiando(true)
    try {
      await nominaApi.cambiarEstado(id, siguiente)
      cargar()
    } finally { setCambiando(false) }
  }

  if (loading) return <div className="nom-loading"><div className="spinner" /></div>
  if (!liq) return <div className="nom-loading">No encontrado</div>

  const { detalles = [] } = liq
  const sig = ESTADO_SIGUIENTE[liq.estado]

  return (
    <div className="nomina-page">

      {/* ← Volver */}
      <button className="nom-btn-back" onClick={() => navigate('/nomina')}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
        Volver
      </button>

      {/* Header */}
      <div className="nom-header">
        <div>
          <h2 className="nom-titulo">Nómina — {periodoLabel(liq.periodo)}</h2>
          <p className="nom-sub">{liq.num_empleados} empleado{liq.num_empleados !== 1 ? 's' : ''} liquidado{liq.num_empleados !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className={`nom-estado nom-estado--${ESTADO_COLOR[liq.estado]}`}>{liq.estado}</span>
          {sig && (
            <button className="nom-btn-dark" onClick={avanzarEstado} disabled={cambiando}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12"/></svg>
              {cambiando ? '...' : `Marcar como ${sig}`}
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="nom-kpis">
        <div className="nom-kpi">
          <p className="nom-kpi-label">Total devengado</p>
          <p className="nom-kpi-val">{COP(liq.total_devengado)}</p>
        </div>
        <div className="nom-kpi">
          <p className="nom-kpi-label">Deducciones empleado</p>
          <p className="nom-kpi-val nom-kpi-val--danger">-{COP(liq.total_deducciones)}</p>
        </div>
        <div className="nom-kpi nom-kpi--dark">
          <p className="nom-kpi-label">Neto a pagar</p>
          <p className="nom-kpi-val nom-kpi-val--lg">{COP(liq.total_neto)}</p>
        </div>
        <div className="nom-kpi nom-kpi--accent-border">
          <p className="nom-kpi-label">Aportes empresa</p>
          <p className="nom-kpi-val nom-kpi-val--accent">{COP(liq.total_aportes_empresa)}</p>
        </div>
      </div>

      {/* Tabla empleados */}
      <div className="nom-tabla">
        <div className="nom-det-head">
          <span>Empleado</span>
          <span>Devengado</span>
          <span>Deducciones</span>
          <span>Neto</span>
          <span>Aportes emp.</span>
          <span></span>
        </div>
        {detalles.map(d => (
          <div key={d.id} className="nom-det-row">
            <div className="nom-emp-col">
              <span className="nom-emp-nombre">{d.nombre_empleado}</span>
              <span className="nom-emp-doc">{d.cargo} · {d.dias_trabajados} días</span>
            </div>
            <span>{COP(d.total_devengado)}</span>
            <span className="nom-danger">-{COP(d.total_deducciones)}</span>
            <span className="nom-cell-bold">{COP(d.neto_pagar)}</span>
            <span className="nom-kpi-val--accent" style={{ fontSize: 14, fontWeight: 700 }}>{COP(d.total_aportes)}</span>
            <button
              className="nom-btn-colilla"
              onClick={() => navigate(`/nomina/colilla/${d.id}`)}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Colilla
            </button>
          </div>
        ))}
      </div>

      {/* Provisiones */}
      <div className="nom-prov-card">
        <p className="nom-prov-label">Provisiones del mes (referencia)</p>
        <div className="nom-prov-grid">
          <div>
            <span className="nom-prov-lab">Prima</span>
            <span className="nom-prov-val">{COP(detalles.reduce((s,d)=>s+d.prov_prima,0))}</span>
          </div>
          <div>
            <span className="nom-prov-lab">Cesantías</span>
            <span className="nom-prov-val">{COP(detalles.reduce((s,d)=>s+d.prov_cesantias,0))}</span>
          </div>
          <div>
            <span className="nom-prov-lab">Int. cesantías</span>
            <span className="nom-prov-val">{COP(detalles.reduce((s,d)=>s+d.prov_int_cesantias,0))}</span>
          </div>
          <div>
            <span className="nom-prov-lab">Vacaciones</span>
            <span className="nom-prov-val">{COP(detalles.reduce((s,d)=>s+d.prov_vacaciones,0))}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
