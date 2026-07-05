import { useState, useEffect, useRef } from 'react'
import { ticketsApi } from '../api/client'
import './Consultas.css'

function formatBytes(b) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

const TIPOS    = ['CONTABILIDAD', 'LEGAL', 'TRIBUTARIO', 'NOMINA', 'OTRO']
const URGENCIAS = ['BAJA', 'MEDIA', 'ALTA']

const ESTADO_LABEL = { NUEVO: 'Nuevo', EN_PROCESO: 'En proceso', EN_REVISION: 'En revisión', COMPLETADO: 'Completado' }
const ESTADO_KEY   = { NUEVO: 'nuevo', EN_PROCESO: 'proceso', EN_REVISION: 'revision', COMPLETADO: 'completado' }
const TIPO_LABEL   = { CONTABILIDAD: 'Contabilidad', LEGAL: 'Legal', TRIBUTARIO: 'Tributario', NOMINA: 'Nómina', OTRO: 'Otro' }

function TipoIcon({ tipo, size = 13 }) {
  const p = { width: size, height: size, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 }
  if (tipo === 'CONTABILIDAD') return <svg {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  if (tipo === 'LEGAL')        return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  if (tipo === 'TRIBUTARIO')   return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  if (tipo === 'NOMINA')       return <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
  return <svg {...p}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
}

function FileIcon({ mime, size = 14 }) {
  const p = { width: size, height: size, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 }
  if (mime?.startsWith('image/')) return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  return <svg {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
}

// ── Formulario nueva consulta ─────────────────────────────
function TicketForm({ onCreado, onCancelar }) {
  const [form, setForm] = useState({ tipo: 'CONTABILIDAD', asunto: '', descripcion: '', urgencia: 'MEDIA' })
  const [archivosLocales, setArchivosLocales] = useState([])
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
      for (const file of archivosLocales) {
        try { await ticketsApi.subirArchivo(ticket.id, file) } catch {}
      }
      onCreado(ticket)
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al crear consulta')
    } finally { setLoading(false) }
  }

  return (
    <div className="con-form-card">
      <div className="con-form-head">
        <h2 className="con-form-titulo">Nueva consulta</h2>
        <p className="con-form-sub">Nuestro equipo te responderá a la brevedad.</p>
      </div>

      <form onSubmit={submit} className="con-form-body">
        <div className="con-form-row">
          <div className="con-form-group">
            <label className="con-form-label">Tipo de consulta</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
            </select>
          </div>
          <div className="con-form-group">
            <label className="con-form-label">Urgencia</label>
            <div className="con-urg-toggles">
              {URGENCIAS.map(u => (
                <button key={u} type="button"
                  className={`con-urg-toggle ${form.urgencia === u ? `con-urg-toggle--active con-urg-toggle--${u.toLowerCase()}` : ''}`}
                  onClick={() => set('urgencia', u)}>
                  {u.charAt(0) + u.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="con-form-group">
          <label className="con-form-label">Asunto</label>
          <input type="text" placeholder="Ej: Revisión declaración de renta 2024"
            value={form.asunto} onChange={e => set('asunto', e.target.value)} />
        </div>

        <div className="con-form-group">
          <label className="con-form-label">Descripción</label>
          <textarea rows={5} placeholder="Describe tu consulta con el mayor detalle posible..."
            value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
        </div>

        <div className="con-form-group">
          <label className="con-form-label">Archivos adjuntos (opcional)</label>
          <input ref={fileRef} type="file" id="file-form" className="con-file-hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt"
            onChange={agregarArchivo} />
          {archivosLocales.length > 0 && (
            <div className="con-preview">
              {archivosLocales.map((f, i) => (
                <div key={i} className="con-preview-item">
                  <FileIcon mime={f.type} />
                  <span className="con-preview-name">{f.name}</span>
                  <span className="con-preview-size">{formatBytes(f.size)}</span>
                  <button type="button" className="con-btn-quitar" onClick={() => quitarArchivo(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
          <label htmlFor="file-form" className="con-btn-upload">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Adjuntar archivo
          </label>
          <p className="con-upload-hint">PDF, Word, Excel, imágenes · máx. 10 MB</p>
        </div>

        {err && <div className="con-alert-error">{err}</div>}

        <div className="con-form-actions">
          <button type="button" className="con-btn-sec" onClick={onCancelar}>Cancelar</button>
          <button type="submit" className="con-btn-dark" disabled={loading}>
            {loading ? (
              <><span className="con-spinner" /> Enviando...</>
            ) : (
              <>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Enviar consulta
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Detalle ────────────────────────────────────────────────
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
    <div className="con-detalle">
      <button className="con-btn-back" onClick={onVolver}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
        Volver
      </button>

      <div className="con-detalle-header">
        <div className="con-detalle-tipo">
          <TipoIcon tipo={ticket.tipo} />
          {TIPO_LABEL[ticket.tipo]}
        </div>
        <h1 className="con-detalle-titulo">{ticket.asunto}</h1>
        <div className="con-detalle-meta">
          <span className={`con-estado con-estado--${ESTADO_KEY[ticket.estado]}`}>
            • {ESTADO_LABEL[ticket.estado]}
          </span>
          <span className={`con-urg con-urg--${ticket.urgencia.toLowerCase()}`}>
            {ticket.urgencia.charAt(0) + ticket.urgencia.slice(1).toLowerCase()}
          </span>
          {ticket.profesionales && (
            <span className="con-meta-asignado">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {ticket.profesionales.nombre}
            </span>
          )}
          <span className="con-meta-fecha">
            {new Date(ticket.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="con-detalle-body">
        {/* Columna principal */}
        <div className="con-main">
          <div className="con-section-card">
            <p className="con-section-label">Descripción original</p>
            <p className="con-desc-text">{ticket.descripcion}</p>
          </div>

          <div className="con-section-card con-conv-card">
            <p className="con-section-label">Conversación</p>
            <div className="con-hilo">
              {mensajes.length === 0
                ? <p className="con-hilo-empty">Aún no hay mensajes. Puedes escribir o adjuntar un archivo.</p>
                : mensajes.map(m => (
                  <div key={m.id} className={`con-burbuja ${m.autor_tipo === 'EMPRESA' ? 'con-burbuja--empresa' : 'con-burbuja--pro'}`}>
                    <div className="con-burbuja-meta">
                      <span className="con-burbuja-autor">{m.autor_nombre}</span>
                      <span className="con-burbuja-fecha">
                        {new Date(m.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="con-burbuja-txt">{m.contenido}</p>
                  </div>
                ))
              }
              <div ref={bottomRef} />
            </div>
            {!completado && (
              <form className="con-reply" onSubmit={enviar}>
                <textarea className="con-reply-area" rows={2} placeholder="Escribe un mensaje..."
                  value={texto} onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(e) } }}
                />
                <button type="submit" className="con-btn-send" disabled={sending || !texto.trim()} title="Enviar">
                  <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Archivos */}
        <aside className="con-side">
          <div className="con-section-card">
            <p className="con-section-label">Archivos adjuntos</p>
            <div className="con-section-body">
              {archivos.length === 0
                ? <p className="con-side-empty">Sin archivos adjuntos</p>
                : (
                  <div className="con-archivos-list">
                    {archivos.map(a => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="con-archivo">
                        <span className="con-archivo-icon"><FileIcon mime={a.tipo_mime} /></span>
                        <div className="con-archivo-info">
                          <p className="con-archivo-nombre">{a.nombre_original}</p>
                          <p className="con-archivo-size">{formatBytes(a.tamanio)}</p>
                        </div>
                        <svg className="con-archivo-dl" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 10l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    ))}
                  </div>
                )
              }
              {!completado && (
                <>
                  <input ref={fileRef} type="file" id="file-upload" className="con-file-hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt"
                    onChange={handleFile} />
                  <label htmlFor="file-upload" className={`con-btn-upload ${uploading ? 'con-btn-upload--loading' : ''}`}>
                    {uploading ? (
                      <><span className="con-spinner" /> Subiendo...</>
                    ) : (
                      <>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Adjuntar archivo
                      </>
                    )}
                  </label>
                  <p className="con-upload-hint">PDF, Word, Excel, imágenes · máx. 10 MB</p>
                  {uploadErr && <p className="con-alert-error" style={{ marginTop: '.5rem' }}>{uploadErr}</p>}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ── Vista principal ────────────────────────────────────────
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

  if (loading) return <div className="con-loading"><div className="con-spinner-lg" /></div>

  if (vista === 'nuevo') return (
    <div className="con-page">
      <TicketForm onCreado={ticketCreado} onCancelar={() => setVista('lista')} />
    </div>
  )

  if (vista === 'detalle' && ticketActivo) return (
    <div className="con-page">
      <TicketDetalle ticket={ticketActivo} onVolver={() => { setVista('lista'); setTicketActivo(null) }} />
    </div>
  )

  return (
    <div className="con-page">
      <div className="con-header">
        <div>
          <h1 className="con-titulo">Mis consultas</h1>
          <p className="con-sub">Gestiona tus consultas con nuestro equipo de contadores y abogados.</p>
        </div>
        <button className="con-btn-dark" onClick={() => setVista('nuevo')}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Nueva consulta
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="con-empty">
          <div className="con-empty-icon">
            <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="con-empty-title">Sin consultas todavía</p>
          <p className="con-empty-sub">Crea tu primera consulta y nuestro equipo te responderá pronto.</p>
          <button className="con-btn-dark" onClick={() => setVista('nuevo')}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Crear consulta
          </button>
        </div>
      ) : (
        <div className="con-grid">
          {tickets.map(t => (
            <div key={t.id} className="con-card" onClick={() => abrirTicket(t)}>
              <div className="con-card-top">
                <span className="con-tipo-label">
                  <TipoIcon tipo={t.tipo} />
                  {TIPO_LABEL[t.tipo]}
                </span>
                <span className={`con-urg con-urg--${t.urgencia.toLowerCase()}`}>
                  {t.urgencia.charAt(0) + t.urgencia.slice(1).toLowerCase()}
                </span>
              </div>
              <h4 className="con-asunto">{t.asunto}</h4>
              {t.profesionales && (
                <p className="con-asignado">
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  {t.profesionales.nombre}
                </p>
              )}
              <div className="con-card-footer">
                <span className={`con-estado con-estado--${ESTADO_KEY[t.estado]}`}>
                  • {ESTADO_LABEL[t.estado]}
                </span>
                <span className="con-fecha">{new Date(t.created_at).toLocaleDateString('es-CO')}</span>
              </div>
            </div>
          ))}
          {/* Placeholder nueva consulta */}
          <div className="con-card con-card--new" onClick={() => setVista('nuevo')}>
            <div className="con-card-new-icon">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <p className="con-card-new-label">Crear nueva consulta</p>
          </div>
        </div>
      )}
    </div>
  )
}
