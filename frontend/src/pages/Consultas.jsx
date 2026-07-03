import { useState, useEffect, useRef } from 'react'
import { ticketsApi } from '../api/client'
import './Consultas.css'

function FileIcon({ mime }) {
  if (mime?.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📄'
  if (mime?.includes('word')) return '📝'
  if (mime?.includes('excel') || mime?.includes('sheet')) return '📊'
  return '📎'
}
function formatBytes(b) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1048576).toFixed(1)} MB`
}

const TIPOS    = ['CONTABILIDAD', 'LEGAL', 'TRIBUTARIO', 'NOMINA', 'OTRO']
const URGENCIAS = ['BAJA', 'MEDIA', 'ALTA']

const ESTADO_LABEL = { NUEVO: 'Nuevo', EN_PROCESO: 'En proceso', EN_REVISION: 'En revisión', COMPLETADO: 'Completado' }
const ESTADO_CLASS = { NUEVO: 'badge-nuevo', EN_PROCESO: 'badge-proceso', EN_REVISION: 'badge-revision', COMPLETADO: 'badge-completado' }
const URGENCIA_CLASS = { BAJA: 'urg-baja', MEDIA: 'urg-media', ALTA: 'urg-alta' }
const TIPO_ICON = { CONTABILIDAD: '📊', LEGAL: '⚖️', TRIBUTARIO: '🏛️', NOMINA: '👥', OTRO: '📋' }

// ── Formulario nueva consulta ─────────────────────────────────────────────────
function TicketForm({ onCreado, onCancelar }) {
  const [form, setForm] = useState({ tipo: 'CONTABILIDAD', asunto: '', descripcion: '', urgencia: 'MEDIA' })
  const [archivosLocales, setArchivosLocales] = useState([]) // archivos antes de crear ticket
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef()
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function agregarArchivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setErr('El archivo supera 10 MB'); return }
    setArchivosLocales(prev => [...prev, file])
    setErr('')
    fileRef.current.value = ''
  }

  function quitarArchivo(i) {
    setArchivosLocales(prev => prev.filter((_, idx) => idx !== i))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.asunto.trim() || !form.descripcion.trim()) return setErr('Completa todos los campos')
    setLoading(true); setErr('')
    try {
      const { data: ticket } = await ticketsApi.crear(form)
      // Subir archivos adjuntos al ticket recién creado
      for (const file of archivosLocales) {
        try { await ticketsApi.subirArchivo(ticket.id, file) } catch {}
      }
      onCreado(ticket)
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al crear consulta')
    } finally { setLoading(false) }
  }

  return (
    <div className="form-card">
      <div className="form-card-header">
        <h2>Nueva consulta</h2>
        <p className="muted t-sm">Nuestro equipo te responderá a la brevedad</p>
      </div>

      <form onSubmit={submit}>
        <div className="form-row">
          <div className="form-group">
            <label>Tipo de consulta</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS.map(t => (
                <option key={t} value={t}>{TIPO_ICON[t]} {t.charAt(0) + t.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Urgencia</label>
            <div className="urgencia-pills">
              {URGENCIAS.map(u => (
                <button key={u} type="button"
                  className={`urg-pill ${form.urgencia === u ? `urg-pill--active ${URGENCIA_CLASS[u]}` : ''}`}
                  onClick={() => set('urgencia', u)}>
                  {u.charAt(0) + u.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Asunto</label>
          <input type="text" placeholder="Ej: Revisión declaración de renta 2024"
            value={form.asunto} onChange={e => set('asunto', e.target.value)} />
        </div>

        <div className="form-group">
          <label>Descripción</label>
          <textarea rows={5} placeholder="Describe tu consulta con el mayor detalle posible. Incluye fechas, montos o documentos relevantes..."
            value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
        </div>

        {/* Adjuntar archivos antes de enviar */}
        <div className="form-group">
          <label>Archivos adjuntos (opcional)</label>
          <input ref={fileRef} type="file" id="file-form" className="file-input-hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt"
            onChange={agregarArchivo} />
          {archivosLocales.length > 0 && (
            <div className="archivos-preview">
              {archivosLocales.map((f, i) => (
                <div key={i} className="archivo-preview-item">
                  <span><FileIcon mime={f.type} /> {f.name}</span>
                  <span className="t-xs muted">{formatBytes(f.size)}</span>
                  <button type="button" className="btn-quitar" onClick={() => quitarArchivo(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
          <label htmlFor="file-form" className="btn-upload" style={{ marginTop: archivosLocales.length ? '.5rem' : 0 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Adjuntar archivo
          </label>
          <p className="t-xs muted" style={{ marginTop: '.3rem' }}>PDF, Word, Excel, imágenes · máx. 10 MB</p>
        </div>

        {err && <div className="alert-error">{err}</div>}

        <div className="form-actions">
          <button type="button" className="btn-ghost" onClick={onCancelar}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? <><span className="btn-spinner" /> Enviando...</>
              : <>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Enviar consulta
                </>}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Detalle de ticket ─────────────────────────────────────────────────────────
function TicketDetalle({ ticket, onVolver }) {
  const [mensajes, setMensajes] = useState(ticket.mensajes || [])
  const [archivos, setArchivos] = useState(ticket.archivos || [])
  const [texto, setTexto] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const fileRef = useRef()
  const bottomRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes])

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

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setUploadErr('El archivo supera el límite de 10 MB'); return }
    setUploading(true); setUploadErr('')
    try {
      const { data } = await ticketsApi.subirArchivo(ticket.id, file)
      setArchivos(a => [...a, data])
    } catch (err) {
      setUploadErr(err.response?.data?.error || 'Error al subir el archivo')
    } finally { setUploading(false); fileRef.current.value = '' }
  }

  const completado = ticket.estado === 'COMPLETADO'

  return (
    <div className="detalle-layout">
      {/* Encabezado */}
      <div className="detalle-header">
        <button className="btn-back" onClick={onVolver}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <div className="detalle-title-row">
          <div>
            <div className="detalle-tipo-tag">{TIPO_ICON[ticket.tipo]} {ticket.tipo}</div>
            <h1>{ticket.asunto}</h1>
            <div className="detalle-meta">
              <span className={`badge ${ESTADO_CLASS[ticket.estado]}`}>{ESTADO_LABEL[ticket.estado]}</span>
              <span className={`urg-dot ${URGENCIA_CLASS[ticket.urgencia]}`}>{ticket.urgencia}</span>
              {ticket.profesionales && (
                <span className="meta-asignado">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  {ticket.profesionales.nombre}
                </span>
              )}
              <span className="meta-fecha">{new Date(ticket.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="detalle-body">
        {/* Columna principal */}
        <div className="detalle-main">

          {/* Descripción original */}
          <div className="detalle-desc-card">
            <p className="card-section-label">Descripción original</p>
            <p className="desc-text">{ticket.descripcion}</p>
          </div>

          {/* Conversación */}
          <div className="conv-card">
            <p className="card-section-label">Conversación</p>
            <div className="conv-hilo">
              {mensajes.length === 0
                ? <p className="conv-empty">Aún no hay mensajes. Puedes escribir un mensaje o adjuntar un archivo.</p>
                : mensajes.map(m => (
                  <div key={m.id} className={`burbuja ${m.autor_tipo === 'EMPRESA' ? 'burbuja-empresa' : 'burbuja-pro'}`}>
                    <div className="burbuja-meta">
                      <span className="burbuja-autor">{m.autor_nombre}</span>
                      <span className="burbuja-fecha">{new Date(m.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="burbuja-texto">{m.contenido}</p>
                  </div>
                ))
              }
              <div ref={bottomRef} />
            </div>

            {!completado && (
              <form className="reply-bar" onSubmit={enviar}>
                <textarea rows={2} placeholder="Escribe un mensaje..."
                  value={texto} onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(e) } }}
                />
                <button type="submit" className="btn-send" disabled={sending || !texto.trim()} title="Enviar">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Columna lateral — archivos */}
        <aside className="detalle-side">
          <div className="archivos-card">
            <p className="card-section-label">Archivos adjuntos</p>

            {archivos.length === 0
              ? <p className="t-sm muted" style={{ marginBottom: '.75rem' }}>Sin archivos adjuntos</p>
              : <div className="archivos-list">
                  {archivos.map(a => (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="archivo-item">
                      <span className="archivo-icon"><FileIcon mime={a.tipo_mime} /></span>
                      <div className="archivo-info">
                        <p className="archivo-nombre">{a.nombre_original}</p>
                        <p className="archivo-size t-xs muted">{formatBytes(a.tamanio)}</p>
                      </div>
                      <svg className="archivo-dl" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 10l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  ))}
                </div>
            }

            {!completado && (
              <>
                <input ref={fileRef} type="file" id="file-upload" className="file-input-hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt"
                  onChange={handleFile} />
                <label htmlFor="file-upload" className={`btn-upload ${uploading ? 'btn-upload--loading' : ''}`}>
                  {uploading
                    ? <><span className="btn-spinner" /> Subiendo...</>
                    : <>
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Adjuntar archivo
                      </>}
                </label>
                <p className="t-xs muted" style={{ marginTop: '.4rem' }}>PDF, Word, Excel, imágenes · máx. 10 MB</p>
                {uploadErr && <p className="alert-error" style={{ marginTop: '.5rem' }}>{uploadErr}</p>}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────
export default function Consultas() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('lista')
  const [ticketActivo, setTicketActivo] = useState(null)

  async function cargar() {
    setLoading(true)
    try { const { data } = await ticketsApi.listar(); setTickets(data) }
    finally { setLoading(false) }
  }
  useEffect(() => { cargar() }, [])

  async function abrirTicket(t) {
    const { data } = await ticketsApi.obtener(t.id)
    setTicketActivo(data); setVista('detalle')
  }

  function ticketCreado(t) { setTickets(p => [t, ...p]); setVista('lista') }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>

  if (vista === 'nuevo') return (
    <div className="consultas-page">
      <TicketForm onCreado={ticketCreado} onCancelar={() => setVista('lista')} />
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
        <button className="btn-primary" onClick={() => setVista('nuevo')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nueva consulta
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.3">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3>Sin consultas todavía</h3>
          <p>Crea tu primera consulta y nuestro equipo te responderá pronto.</p>
          <button className="btn-primary" onClick={() => setVista('nuevo')}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Crear consulta
          </button>
        </div>
      ) : (
        <div className="tickets-grid">
          {tickets.map(t => (
            <div key={t.id} className="ticket-card" onClick={() => abrirTicket(t)}>
              <div className="ticket-card-top">
                <span className="ticket-tipo-label">{TIPO_ICON[t.tipo]} {t.tipo.charAt(0) + t.tipo.slice(1).toLowerCase()}</span>
                <span className={`urg-dot ${URGENCIA_CLASS[t.urgencia]}`}>{t.urgencia}</span>
              </div>
              <h4 className="ticket-asunto">{t.asunto}</h4>
              {t.profesionales && (
                <p className="ticket-asignado t-sm">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  {t.profesionales.nombre}
                </p>
              )}
              <div className="ticket-card-footer">
                <span className={`badge ${ESTADO_CLASS[t.estado]}`}>{ESTADO_LABEL[t.estado]}</span>
                <span className="ticket-fecha t-xs muted">{new Date(t.created_at).toLocaleDateString('es-CO')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
