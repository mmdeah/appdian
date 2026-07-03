import { useState, useEffect, useCallback } from 'react'
import { profesionalApi } from '../api/client'
import './ProfesionalAudit.css'

const TIPOS = [
  { value: '',                   label: 'Todos los eventos' },
  { value: 'LOGIN_EMPRESA',      label: '🔑 Login empresa' },
  { value: 'REGISTRO_EMPRESA',   label: '🆕 Registro empresa' },
  { value: 'FACTURA_POS',        label: '🧾 Factura POS' },
  { value: 'FACTURA_FE',         label: '📄 Factura FE' },
  { value: 'PRODUCTO_CREADO',    label: '📦 Producto creado' },
  { value: 'PRODUCTO_EDITADO',   label: '✏️ Producto editado' },
  { value: 'PRODUCTO_ELIMINADO', label: '🗑️ Producto eliminado' },
  { value: 'CLIENTE_CREADO',     label: '👤 Cliente creado' },
  { value: 'CLIENTE_EDITADO',    label: '✏️ Cliente editado' },
  { value: 'CLIENTE_ELIMINADO',  label: '🗑️ Cliente eliminado' },
  { value: 'TICKET_CREADO',      label: '🎫 Ticket creado' },
  { value: 'TICKET_COMPLETADO',  label: '✅ Ticket completado' },
  { value: 'VER_PASSWORD',       label: '👁️ Ver contraseña' },
  { value: 'CONFIG_REGIMEN',     label: '⚙️ Config. régimen' },
]

const TIPO_META = {
  LOGIN_EMPRESA:      { emoji: '🔑', color: 'info' },
  REGISTRO_EMPRESA:   { emoji: '🆕', color: 'success' },
  FACTURA_POS:        { emoji: '🧾', color: 'accent' },
  FACTURA_FE:         { emoji: '📄', color: 'accent' },
  PRODUCTO_CREADO:    { emoji: '📦', color: 'success' },
  PRODUCTO_EDITADO:   { emoji: '✏️', color: 'warning' },
  PRODUCTO_ELIMINADO: { emoji: '🗑️', color: 'danger' },
  CLIENTE_CREADO:     { emoji: '👤', color: 'success' },
  CLIENTE_EDITADO:    { emoji: '✏️', color: 'warning' },
  CLIENTE_ELIMINADO:  { emoji: '🗑️', color: 'danger' },
  TICKET_CREADO:      { emoji: '🎫', color: 'info' },
  TICKET_COMPLETADO:  { emoji: '✅', color: 'success' },
  VER_PASSWORD:       { emoji: '👁️', color: 'danger' },
  CONFIG_REGIMEN:     { emoji: '⚙️', color: 'warning' },
}

function hoy() { return new Date().toISOString().split('T')[0] }
function hace30() {
  const d = new Date(); d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

export default function ProfesionalAudit() {
  const [eventos, setEventos]   = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [filtros, setFiltros]   = useState({ tipo: '', empresa: '', desde: hace30(), hasta: hoy() })
  const [offset, setOffset]     = useState(0)
  const LIMITE = 50

  const cargar = useCallback(async (reset = false) => {
    setLoading(true)
    const nuevoOffset = reset ? 0 : offset
    try {
      const params = {
        limite: LIMITE,
        offset: nuevoOffset,
        ...(filtros.tipo   && { tipo: filtros.tipo }),
        ...(filtros.desde  && { desde: filtros.desde }),
        ...(filtros.hasta  && { hasta: filtros.hasta }),
      }
      const { data } = await profesionalApi.listarAudit(params)
      if (reset) {
        setEventos(data.eventos)
        setOffset(LIMITE)
      } else {
        setEventos(prev => [...prev, ...data.eventos])
        setOffset(nuevoOffset + LIMITE)
      }
      setTotal(data.total)
    } finally { setLoading(false) }
  }, [filtros, offset])

  useEffect(() => { cargar(true) }, [filtros])

  function aplicarFiltro(campo, valor) {
    setFiltros(f => ({ ...f, [campo]: valor }))
    setOffset(0)
  }

  const hayMas = eventos.length < total

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div>
          <h2 className="audit-titulo">Registro de auditoría</h2>
          <p className="audit-subtitulo muted">{total.toLocaleString('es-CO')} eventos · DIAN exige conservar por 5 años</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="audit-filtros">
        <select
          className="audit-select"
          value={filtros.tipo}
          onChange={e => aplicarFiltro('tipo', e.target.value)}
        >
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <div className="audit-fechas">
          <label className="audit-fecha-label">Desde</label>
          <input type="date" className="audit-input-fecha" value={filtros.desde}
            onChange={e => aplicarFiltro('desde', e.target.value)} />
          <label className="audit-fecha-label">Hasta</label>
          <input type="date" className="audit-input-fecha" value={filtros.hasta}
            onChange={e => aplicarFiltro('hasta', e.target.value)} />
        </div>

        <button className="audit-btn-reset" onClick={() => setFiltros({ tipo: '', empresa: '', desde: hace30(), hasta: hoy() })}>
          Resetear
        </button>
      </div>

      {/* Lista */}
      {loading && eventos.length === 0 ? (
        <div className="audit-loading"><div className="spinner" /></div>
      ) : eventos.length === 0 ? (
        <div className="audit-empty">Sin eventos para los filtros seleccionados</div>
      ) : (
        <>
          <div className="audit-lista">
            {eventos.map(ev => {
              const meta = TIPO_META[ev.tipo] || { emoji: '📌', color: 'neutral' }
              return (
                <div key={ev.id} className="audit-row">
                  <span className="audit-emoji">{meta.emoji}</span>
                  <div className="audit-row-main">
                    <div className="audit-row-top">
                      <span className={`audit-tipo-badge audit-tipo-badge--${meta.color}`}>{ev.tipo}</span>
                      {ev.empresas && (
                        <span className="audit-empresa-tag">
                          {ev.empresas.nombre}
                          <span className="audit-nit"> · NIT {ev.empresas.nit}</span>
                        </span>
                      )}
                    </div>
                    <p className="audit-desc">{ev.descripcion}</p>
                  </div>
                  <span className="audit-fecha">
                    {new Date(ev.created_at).toLocaleString('es-CO', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              )
            })}
          </div>

          {hayMas && (
            <button className="audit-cargar-mas" onClick={() => cargar(false)} disabled={loading}>
              {loading ? 'Cargando...' : `Cargar más (${total - eventos.length} restantes)`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
