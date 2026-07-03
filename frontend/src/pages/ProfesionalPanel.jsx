import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { profesionalApi } from '../api/client'
import './ProfesionalPanel.css'

const COLUMNAS = [
  { id: 'NUEVO',       label: 'Nuevos',       color: '#3b82f6' },
  { id: 'EN_PROCESO',  label: 'En proceso',   color: '#f59e0b' },
  { id: 'EN_REVISION', label: 'En revisión',  color: '#8b5cf6' },
  { id: 'COMPLETADO',  label: 'Completados',  color: '#10b981' },
]

const URGENCIA_CLASS = { BAJA: 'urg-baja', MEDIA: 'urg-media', ALTA: 'urg-alta' }
const TIPO_ICON = {
  CONTABILIDAD: '📊', LEGAL: '⚖️', TRIBUTARIO: '🏛️', NOMINA: '👥', OTRO: '📋',
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
    <div className="pro-panel">
      <div className="pro-panel-header">
        <div>
          <h1>Panel de tickets</h1>
          <p className="muted t-sm">{tickets.length} consulta{tickets.length !== 1 ? 's' : ''} en total</p>
        </div>
        <div className="pro-filters">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {['CONTABILIDAD','LEGAL','TRIBUTARIO','NOMINA','OTRO'].map(t => (
              <option key={t} value={t}>{t.charAt(0)+t.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <select value={filtroUrgencia} onChange={e => setFiltroUrgencia(e.target.value)}>
            <option value="">Toda urgencia</option>
            {['ALTA','MEDIA','BAJA'].map(u => (
              <option key={u} value={u}>{u.charAt(0)+u.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <button className="btn-outline" onClick={cargar}>↺ Actualizar</button>
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : (
        <div className="kanban-board">
          {COLUMNAS.map(col => (
            <div key={col.id} className="kanban-col">
              <div className="kanban-col-header" style={{ borderTopColor: col.color }}>
                <span className="col-label">{col.label}</span>
                <span className="col-count" style={{ background: col.color + '22', color: col.color }}>
                  {porColumna(col.id).length}
                </span>
              </div>

              <div className="kanban-cards">
                {porColumna(col.id).length === 0 && (
                  <div className="kanban-empty">Sin tickets</div>
                )}
                {porColumna(col.id).map(t => (
                  <div key={t.id} className="kanban-card" onClick={() => navigate(`/panel/ticket/${t.id}`)}>
                    <div className="kcard-top">
                      <span className="kcard-tipo">{TIPO_ICON[t.tipo]} {t.tipo}</span>
                      <span className={`urg-dot ${URGENCIA_CLASS[t.urgencia]}`}>{t.urgencia}</span>
                    </div>
                    <h4 className="kcard-asunto">{t.asunto}</h4>
                    <p className="kcard-empresa t-sm muted">{t.empresas?.nombre}</p>
                    {t.profesionales && (
                      <p className="kcard-asignado t-xs">{t.profesionales.nombre}</p>
                    )}
                    <div className="kcard-footer">
                      <span className="t-xs muted">{new Date(t.updated_at).toLocaleDateString('es-CO')}</span>
                      {col.id !== 'COMPLETADO' && (
                        <div className="kcard-actions" onClick={e => e.stopPropagation()}>
                          {COLUMNAS.filter(c => c.id !== col.id).map(c => (
                            <button
                              key={c.id} className="kcard-move-btn"
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
