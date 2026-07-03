import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { nominaApi } from '../api/client'
import './Nomina.css'

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const ESTADO_SIGUIENTE = { BORRADOR: 'PROCESADA', PROCESADA: 'PAGADA' }
const ESTADO_COLOR = { BORRADOR: 'neutral', PROCESADA: 'warning', PAGADA: 'success' }

function periodoLabel(p) {
  if (!p) return ''
  const [y, m] = p.split('-')
  return new Date(y, m - 1, 1).toLocaleString('es-CO', { month: 'long', year: 'numeric' })
}

export default function NominaLiquidacion() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [liq, setLiq]         = useState(null)
  const [loading, setLoading] = useState(true)
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
      <button className="btn-back" onClick={() => navigate('/nomina')}>← Volver</button>

      <div className="nom-header">
        <div>
          <h2 className="nom-titulo">Nómina — {periodoLabel(liq.periodo)}</h2>
          <p className="muted t-sm">{liq.num_empleados} empleados liquidados</p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
          <span className={`estado-chip estado-chip--${ESTADO_COLOR[liq.estado]}`}>{liq.estado}</span>
          {sig && (
            <button className="btn-pri" onClick={avanzarEstado} disabled={cambiando}>
              {cambiando ? '...' : `Marcar como ${sig}`}
            </button>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="liq-resumen">
        <div className="resumen-card">
          <p className="resumen-label">Total devengado</p>
          <p className="resumen-val">{COP(liq.total_devengado)}</p>
        </div>
        <div className="resumen-card">
          <p className="resumen-label">Deducciones empleados</p>
          <p className="resumen-val color-danger">-{COP(liq.total_deducciones)}</p>
        </div>
        <div className="resumen-card resumen-card--highlight">
          <p className="resumen-label">Neto a pagar</p>
          <p className="resumen-val">{COP(liq.total_neto)}</p>
        </div>
        <div className="resumen-card">
          <p className="resumen-label">Aportes empresa</p>
          <p className="resumen-val color-warning">{COP(liq.total_aportes_empresa)}</p>
        </div>
      </div>

      {/* Tabla empleados */}
      <div className="det-tabla">
        <div className="det-tabla-head">
          <span>Empleado</span>
          <span>Devengado</span>
          <span>Deducciones</span>
          <span>Neto</span>
          <span>Aportes emp.</span>
          <span></span>
        </div>
        {detalles.map(d => (
          <div key={d.id} className="det-row">
            <div>
              <p className="emp-nombre">{d.nombre_empleado}</p>
              <p className="emp-doc muted">{d.cargo} · {d.dias_trabajados} días</p>
            </div>
            <span>{COP(d.total_devengado)}</span>
            <span className="color-danger">-{COP(d.total_deducciones)}</span>
            <span className="font-bold">{COP(d.neto_pagar)}</span>
            <span className="color-warning">{COP(d.total_aportes)}</span>
            <button
              className="btn-colilla"
              onClick={() => navigate(`/nomina/colilla/${d.id}`)}
            >
              🖨️ Colilla
            </button>
          </div>
        ))}
      </div>

      {/* Provisiones totales */}
      <div className="prov-card">
        <p className="section-label-sm">Provisiones del mes (referencia)</p>
        <div className="prov-grid">
          <div><span className="prov-lab">Prima</span><span className="prov-val">{COP(detalles.reduce((s,d)=>s+d.prov_prima,0))}</span></div>
          <div><span className="prov-lab">Cesantías</span><span className="prov-val">{COP(detalles.reduce((s,d)=>s+d.prov_cesantias,0))}</span></div>
          <div><span className="prov-lab">Int. cesantías</span><span className="prov-val">{COP(detalles.reduce((s,d)=>s+d.prov_int_cesantias,0))}</span></div>
          <div><span className="prov-lab">Vacaciones</span><span className="prov-val">{COP(detalles.reduce((s,d)=>s+d.prov_vacaciones,0))}</span></div>
        </div>
      </div>
    </div>
  )
}
