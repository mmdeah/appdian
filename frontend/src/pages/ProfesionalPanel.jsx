import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { profesionalApi } from '../api/client'
import './ProfesionalPanel.css'

async function abrirVistaEmpresa(empresaId, e) {
  e.stopPropagation()
  const win = window.open('', '_blank')
  try {
    const { data } = await profesionalApi.accesoEmpresa(empresaId)
    win.location.href = `/vista-empresa#${data.token}`
  } catch {
    win?.close()
    alert('No se pudo abrir la vista de empresa')
  }
}

const COLUMNAS = [
  { id: 'NUEVO',       label: 'Nuevos',      color: '#3b82f6' },
  { id: 'EN_PROCESO',  label: 'En proceso',  color: '#f59e0b' },
  { id: 'EN_REVISION', label: 'En revisión', color: '#8b5cf6' },
  { id: 'COMPLETADO',  label: 'Completados', color: '#10b981' },
]

const URGENCIA_CLASS = { BAJA: 'pp-urg--baja', MEDIA: 'pp-urg--media', ALTA: 'pp-urg--alta' }

function TipoIcon({ tipo }) {
  if (tipo === 'CONTABILIDAD') return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
  )
  if (tipo === 'LEGAL') return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
    </svg>
  )
  if (tipo === 'TRIBUTARIO') return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
  if (tipo === 'NOMINA') return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
  return (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
    </svg>
  )
}

export default function ProfesionalPanel() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroUrgencia, setFiltroUrgencia] = useState('')
  const navigate = useNavigate()

  async function cargar() {
    setLoading(true)
    try {
      const params = {}
      if (filtroTipo)     params.tipo     = filtroTipo
      if (filtroUrgencia) params.urgencia = filtroUrgencia
      const { data } = await profesionalApi.listarTickets(params)
      setTickets(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [filtroTipo, filtroUrgencia])

  async function moverEstado(ticketId, nuevoEstado) {
    await profesionalApi.actualizarTicket(ticketId, { estado: nuevoEstado })
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, estado: nuevoEstado } : t))
  }

  const porColumna = (estado) => tickets.filter(t => t.estado === estado)

  return (
    <div className="pp-page">

      {/* ── Header ── */}
      <div className="pp-header">
        <div>
          <h1 className="pp-title">Panel de tickets</h1>
          <p className="pp-subtitle">{tickets.length} consulta{tickets.length !== 1 ? 's' : ''} en total</p>
        </div>
        <div className="pp-toolbar">
          <select className="pp-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {['CONTABILIDAD','LEGAL','TRIBUTARIO','NOMINA','OTRO'].map(t => (
              <option key={t} value={t}>{t.charAt(0)+t.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <select className="pp-select" value={filtroUrgencia} onChange={e => setFiltroUrgencia(e.target.value)}>
            <option value="">Toda urgencia</option>
            {['ALTA','MEDIA','BAJA'].map(u => (
              <option key={u} value={u}>{u.charAt(0)+u.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <button className="pp-btn-refresh" onClick={cargar}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="pp-loading"><div className="pp-spinner"/></div>
      ) : (
        <div className="pp-board">
          {COLUMNAS.map(col => (
            <div key={col.id} className="pp-col">

              {/* Columna header */}
              <div className="pp-col-head" style={{ borderTopColor: col.color }}>
                <span className="pp-col-label">{col.label}</span>
                <span className="pp-col-count" style={{ background: col.color + '22', color: col.color }}>
                  {porColumna(col.id).length}
                </span>
              </div>

              {/* Cards */}
              <div className="pp-cards">
                {porColumna(col.id).length === 0 && (
                  <div className="pp-empty">Sin tickets</div>
                )}
                {porColumna(col.id).map(t => (
                  <div key={t.id} className="pp-card" onClick={() => navigate(`/panel/ticket/${t.id}`)}>

                    {/* Tipo + urgencia */}
                    <div className="pp-card-top">
                      <span className="pp-card-tipo">
                        <TipoIcon tipo={t.tipo}/>
                        {t.tipo}
                      </span>
                      <span className={`pp-urg ${URGENCIA_CLASS[t.urgencia]}`}>{t.urgencia}</span>
                    </div>

                    {/* Asunto */}
                    <h4 className="pp-card-asunto">{t.asunto}</h4>

                    {/* Empresa + Ver empresa */}
                    <div className="pp-card-empresa-row">
                      <p className="pp-card-empresa">{t.empresas?.nombre}</p>
                      <button
                        className="pp-visor-btn"
                        title="Ver como cliente"
                        onClick={(e) => abrirVistaEmpresa(t.empresa_id, e)}
                      >
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Ver empresa
                      </button>
                    </div>

                    {/* Asignado */}
                    {t.profesionales && (
                      <p className="pp-card-asignado">{t.profesionales.nombre}</p>
                    )}

                    {/* Footer */}
                    <div className="pp-card-foot">
                      <span className="pp-card-fecha">
                        {new Date(t.updated_at).toLocaleDateString('es-CO')}
                      </span>
                      {col.id !== 'COMPLETADO' && (
                        <div className="pp-card-moves" onClick={e => e.stopPropagation()}>
                          {COLUMNAS.filter(c => c.id !== col.id).map(c => (
                            <button
                              key={c.id}
                              className="pp-move-btn"
                              style={{ color: c.color }}
                              title={`Mover a ${c.label}`}
                              onClick={() => moverEstado(t.id, c.id)}
                            >
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
