import { useState, useEffect } from 'react'
import { ticketsApi } from '../api/client'
import './Consultas.css'

const TIPOS = ['CONTABILIDAD', 'LEGAL', 'TRIBUTARIO', 'NOMINA', 'OTRO']
const URGENCIAS = ['BAJA', 'MEDIA', 'ALTA']

const ESTADO_LABEL = {
  NUEVO:       'Nuevo',
  EN_PROCESO:  'En proceso',
  EN_REVISION: 'En revisión',
  COMPLETADO:  'Completado',
}
const ESTADO_CLASS = {
  NUEVO:       'badge-nuevo',
  EN_PROCESO:  'badge-proceso',
  EN_REVISION: 'badge-revision',
  COMPLETADO:  'badge-completado',
}
const URGENCIA_CLASS = {
  BAJA:  'urg-baja',
  MEDIA: 'urg-media',
  ALTA:  'urg-alta',
}

function TicketForm({ onCreado }) {
  const [form, setForm] = useState({ tipo: 'CONTABILIDAD', asunto: '', descripcion: '', urgencia: 'MEDIA' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!form.asunto.trim() || !form.descripcion.trim()) return setErr('Completa todos los campos')
    setLoading(true); setErr('')
    try {
      const { data } = await ticketsApi.crear(form)
      setForm({ tipo: 'CONTABILIDAD', asunto: '', descripcion: '', urgencia: 'MEDIA' })
      onCreado(data)
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al crear consulta')
    } finally { setLoading(false) }
  }

  return (
    <form className="consulta-form" onSubmit={submit}>
      <h3 className="form-title">Nueva consulta</h3>

      <div className="form-row">
        <div className="form-group">
          <label>Tipo</label>
          <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
            {TIPOS.map(t => <option key={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Urgencia</label>
          <select value={form.urgencia} onChange={e => setForm(p => ({ ...p, urgencia: e.target.value }))}>
            {URGENCIAS.map(u => <option key={u}>{u.charAt(0) + u.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Asunto</label>
        <input
          type="text" placeholder="Ej: Revisión declaración de renta"
          value={form.asunto} onChange={e => setForm(p => ({ ...p, asunto: e.target.value }))}
        />
      </div>
      <div className="form-group">
        <label>Descripción</label>
        <textarea
          rows={4} placeholder="Explica tu consulta con el mayor detalle posible..."
          value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
        />
      </div>
      {err && <p className="form-error">{err}</p>}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar consulta'}
      </button>
    </form>
  )
}

function TicketDetalle({ ticket, onVolver }) {
  const [mensajes, setMensajes] = useState(ticket.mensajes || [])
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim()) return
    setSending(true)
    try {
      const { data } = await ticketsApi.responder(ticket.id, texto)
      setMensajes(m => [...m, data])
      setTexto('')
    } finally { setSending(false) }
  }

  return (
    <div className="ticket-detalle">
      <button className="btn-back" onClick={onVolver}>← Volver</button>

      <div className="ticket-detalle-header">
        <div>
          <h2>{ticket.asunto}</h2>
          <p className="ticket-meta">
            <span className={`badge ${ESTADO_CLASS[ticket.estado]}`}>{ESTADO_LABEL[ticket.estado]}</span>
            <span className={`urg-dot ${URGENCIA_CLASS[ticket.urgencia]}`}>{ticket.urgencia}</span>
            {ticket.profesionales && (
              <span className="asignado-a">Asignado a: <strong>{ticket.profesionales.nombre}</strong></span>
            )}
          </p>
        </div>
      </div>

      <div className="ticket-desc-box">
        <p className="ticket-desc-label">Descripción original</p>
        <p>{ticket.descripcion}</p>
      </div>

      <div className="mensajes-list">
        {mensajes.length === 0 && <p className="muted t-sm">Aún no hay mensajes en esta consulta.</p>}
        {mensajes.map(m => (
          <div key={m.id} className={`mensaje ${m.autor_tipo === 'EMPRESA' ? 'msg-empresa' : 'msg-profesional'}`}>
            <div className="msg-header">
              <span className="msg-autor">{m.autor_nombre}</span>
              <span className="msg-fecha">{new Date(m.created_at).toLocaleString('es-CO')}</span>
            </div>
            <p className="msg-body">{m.contenido}</p>
          </div>
        ))}
      </div>

      {ticket.estado !== 'COMPLETADO' && (
        <form className="msg-reply-form" onSubmit={enviar}>
          <textarea
            rows={3} placeholder="Escribe tu respuesta..."
            value={texto} onChange={e => setTexto(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={sending || !texto.trim()}>
            {sending ? 'Enviando...' : 'Responder'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function Consultas() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('lista') // 'lista' | 'nuevo' | ticket.id
  const [ticketActivo, setTicketActivo] = useState(null)

  async function cargar() {
    setLoading(true)
    try {
      const { data } = await ticketsApi.listar()
      setTickets(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  async function abrirTicket(t) {
    const { data } = await ticketsApi.obtener(t.id)
    setTicketActivo(data)
    setVista('detalle')
  }

  function ticketCreado(t) {
    setTickets(prev => [t, ...prev])
    setVista('lista')
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>

  if (vista === 'nuevo') return (
    <div className="consultas-page">
      <button className="btn-back" onClick={() => setVista('lista')}>← Volver</button>
      <TicketForm onCreado={ticketCreado} />
    </div>
  )

  if (vista === 'detalle' && ticketActivo) return (
    <div className="consultas-page">
      <TicketDetalle ticket={ticketActivo} onVolver={() => { setVista('lista'); setTicketActivo(null) }} />
    </div>
  )

  return (
    <div className="consultas-page">
      <div className="consultas-header">
        <div>
          <h1>Mis consultas</h1>
          <p className="muted t-sm">Gestiona tus consultas con nuestro equipo de contadores y abogados</p>
        </div>
        <button className="btn-primary" onClick={() => setVista('nuevo')}>+ Nueva consulta</button>
      </div>

      {tickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.3">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3>Sin consultas todavía</h3>
          <p>Crea tu primera consulta y nuestro equipo te responderá pronto.</p>
          <button className="btn-primary" onClick={() => setVista('nuevo')}>Crear consulta</button>
        </div>
      ) : (
        <div className="tickets-grid">
          {tickets.map(t => (
            <div key={t.id} className="ticket-card" onClick={() => abrirTicket(t)}>
              <div className="ticket-card-top">
                <span className={`badge ${ESTADO_CLASS[t.estado]}`}>{ESTADO_LABEL[t.estado]}</span>
                <span className={`urg-dot ${URGENCIA_CLASS[t.urgencia]}`}>{t.urgencia}</span>
              </div>
              <h4 className="ticket-asunto">{t.asunto}</h4>
              <p className="ticket-tipo t-sm muted">{t.tipo}</p>
              {t.profesionales && (
                <p className="ticket-asignado t-sm">Asignado a: {t.profesionales.nombre}</p>
              )}
              <p className="ticket-fecha t-xs muted">{new Date(t.created_at).toLocaleDateString('es-CO')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
