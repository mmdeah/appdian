import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { profesionalApi } from '../api/client'
import './ProfesionalTicket.css'

const ESTADOS = ['NUEVO', 'EN_PROCESO', 'EN_REVISION', 'COMPLETADO']
const ESTADO_LABEL = { NUEVO: 'Nuevo', EN_PROCESO: 'En proceso', EN_REVISION: 'En revisión', COMPLETADO: 'Completado' }
const URGENCIAS = ['BAJA', 'MEDIA', 'ALTA']

function kCOP(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

export default function ProfesionalTicket() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [profesionales, setProfesionales] = useState([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [esInterno, setEsInterno] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    Promise.all([
      profesionalApi.obtenerTicket(id),
      profesionalApi.listarProfesionales(),
    ]).then(([{ data: t }, { data: profs }]) => {
      setTicket(t)
      setProfesionales(profs)
      return t.empresa_id ? profesionalApi.resumenEmpresa(t.empresa_id) : null
    }).then(res => {
      if (res) setEmpresa(res.data)
    }).finally(() => setLoading(false))
  }, [id])

  async function cambiarEstado(estado) {
    await profesionalApi.actualizarTicket(id, { estado })
    setTicket(t => ({ ...t, estado }))
  }

  async function asignar(profesional_id) {
    await profesionalApi.actualizarTicket(id, { asignado_a: profesional_id || null })
    const prof = profesionales.find(p => p.id === profesional_id)
    setTicket(t => ({ ...t, asignado_a: profesional_id, profesionales: prof || null }))
  }

  async function enviar(e) {
    e.preventDefault()
    if (!mensaje.trim()) return
    setSending(true)
    try {
      const { data } = await profesionalApi.responder(id, mensaje, esInterno)
      setTicket(t => ({ ...t, mensajes: [...(t.mensajes || []), data] }))
      setMensaje('')
    } finally { setSending(false) }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>
  if (!ticket) return <div className="page-loading">Ticket no encontrado</div>

  const mensajes = ticket.mensajes || []

  return (
    <div className="pro-ticket-page">
      <button className="btn-back" onClick={() => navigate('/panel')}>← Volver al panel</button>

      <div className="pro-ticket-layout">
        {/* Columna principal */}
        <div className="pro-ticket-main">
          <div className="ticket-hero">
            <div>
              <span className="ticket-tipo-tag">{ticket.tipo}</span>
              <h1>{ticket.asunto}</h1>
              <p className="ticket-meta-line">
                <strong>{ticket.empresas?.nombre}</strong>
                <span className="muted">·</span>
                <span className="muted">{new Date(ticket.created_at).toLocaleString('es-CO')}</span>
              </p>
            </div>
          </div>

          <div className="ticket-descripcion">
            <p className="section-label">Descripción</p>
            <p>{ticket.descripcion}</p>
          </div>

          {/* Hilo de mensajes */}
          <div className="mensajes-section">
            <p className="section-label">Conversación ({mensajes.length})</p>
            <div className="mensajes-hilo">
              {mensajes.length === 0 && <p className="muted t-sm">Sin mensajes aún.</p>}
              {mensajes.map(m => (
                <div
                  key={m.id}
                  className={`hilo-msg ${m.autor_tipo === 'PROFESIONAL' ? 'msg-pro' : 'msg-emp'} ${m.es_interno ? 'msg-interno' : ''}`}
                >
                  {m.es_interno && <span className="interno-tag">Nota interna</span>}
                  <div className="hilo-header">
                    <span className="hilo-autor">{m.autor_nombre}</span>
                    <span className="hilo-fecha">{new Date(m.created_at).toLocaleString('es-CO')}</span>
                  </div>
                  <p className="hilo-body">{m.contenido}</p>
                </div>
              ))}
            </div>

            <form className="reply-form" onSubmit={enviar}>
              <textarea
                rows={3} placeholder={esInterno ? 'Nota interna (no visible para el cliente)...' : 'Responder al cliente...'}
                value={mensaje} onChange={e => setMensaje(e.target.value)}
                className={esInterno ? 'internal-input' : ''}
              />
              <div className="reply-footer">
                <label className="interno-toggle">
                  <input type="checkbox" checked={esInterno} onChange={e => setEsInterno(e.target.checked)} />
                  Nota interna
                </label>
                <button type="submit" className="btn-primary" disabled={sending || !mensaje.trim()}>
                  {sending ? 'Enviando...' : esInterno ? 'Guardar nota' : 'Responder'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Columna lateral */}
        <aside className="pro-ticket-sidebar">

          {/* Estado */}
          <div className="sidebar-card">
            <p className="section-label">Estado</p>
            <div className="estado-btns">
              {ESTADOS.map(s => (
                <button
                  key={s}
                  className={`estado-btn ${ticket.estado === s ? 'estado-active' : ''}`}
                  onClick={() => cambiarEstado(s)}
                >
                  {ESTADO_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Asignar */}
          <div className="sidebar-card">
            <p className="section-label">Asignado a</p>
            <select
              value={ticket.asignado_a || ''}
              onChange={e => asignar(e.target.value || null)}
              className="asignar-select"
            >
              <option value="">Sin asignar</option>
              {profesionales.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.especialidad})</option>
              ))}
            </select>
          </div>

          {/* Acceso a la cuenta del cliente */}
          {empresa && (
            <div className="sidebar-card empresa-card">
              <p className="section-label">Cliente</p>
              <p className="empresa-nombre-big">{empresa.empresa?.nombre}</p>

              {/* Datos de acceso */}
              <div className="acceso-box">
                <p className="acceso-label">Datos de acceso a la cuenta</p>
                <div className="acceso-row">
                  <span className="acceso-key">Email</span>
                  <span className="acceso-val">{empresa.empresa?.email}</span>
                </div>
                <div className="acceso-row">
                  <span className="acceso-key">NIT</span>
                  <span className="acceso-val">{empresa.empresa?.nit}</span>
                </div>
                {empresa.empresa?.telefono && (
                  <div className="acceso-row">
                    <span className="acceso-key">Teléfono</span>
                    <span className="acceso-val">{empresa.empresa.telefono}</span>
                  </div>
                )}
                {empresa.empresa?.direccion && (
                  <div className="acceso-row">
                    <span className="acceso-key">Dirección</span>
                    <span className="acceso-val">{empresa.empresa.direccion}</span>
                  </div>
                )}
              </div>

              {/* Resumen financiero */}
              <div className="empresa-stats">
                <div className="estad-item">
                  <span className="estad-val">{empresa.resumen?.num_facturas || 0}</span>
                  <span className="estad-lab">Facturas</span>
                </div>
                <div className="estad-item">
                  <span className="estad-val">{kCOP(empresa.resumen?.total_ventas || 0)}</span>
                  <span className="estad-lab">Ventas</span>
                </div>
                <div className="estad-item">
                  <span className="estad-val">{kCOP(empresa.resumen?.total_iva || 0)}</span>
                  <span className="estad-lab">IVA</span>
                </div>
              </div>

              {empresa.facturas_recientes?.length > 0 && (
                <div className="facturas-recientes">
                  <p className="section-label" style={{ marginTop: '.75rem' }}>Facturas recientes</p>
                  {empresa.facturas_recientes.slice(0, 5).map((f, i) => (
                    <div key={i} className="fac-row">
                      <span className="t-sm truncate">{f.cliente_nombre}</span>
                      <span className="t-sm font-semibold">{kCOP(f.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
