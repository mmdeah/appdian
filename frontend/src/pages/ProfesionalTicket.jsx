import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { profesionalApi } from '../api/client'
import './ProfesionalTicket.css'

const ESTADOS    = ['NUEVO', 'EN_PROCESO', 'EN_REVISION', 'COMPLETADO']
const ESTADO_LABEL = { NUEVO: 'Nuevo', EN_PROCESO: 'En proceso', EN_REVISION: 'En revisión', COMPLETADO: 'Completado' }

function kCOP(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
}
function formatBytes(b) {
  if (!b) return ''
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function FileIcon({ mime }) {
  if (mime?.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📄'
  if (mime?.includes('word')) return '📝'
  if (mime?.includes('excel') || mime?.includes('sheet')) return '📊'
  return '📎'
}

export default function ProfesionalTicket() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [profesionales, setProfesionales] = useState([])
  const [archivos, setArchivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [esInterno, setEsInterno] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    Promise.all([
      profesionalApi.obtenerTicket(id),
      profesionalApi.listarProfesionales(),
    ]).then(([{ data: t }, { data: profs }]) => {
      setTicket(t)
      setArchivos(t.archivos || [])
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

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { data } = await profesionalApi.subirArchivo(id, file)
      setArchivos(a => [...a, data])
    } catch (err) {
      alert(err.response?.data?.error || 'Error al subir archivo')
    } finally { setUploading(false); fileRef.current.value = '' }
  }

  async function abrirVistaEmpresa() {
    const empresaId = ticket?.empresa_id
    if (!empresaId) { alert('Esta consulta no tiene empresa asociada'); return }
    const win = window.open('', '_blank')
    try {
      const { data } = await profesionalApi.accesoEmpresa(empresaId)
      win.location.href = `/vista-empresa#${data.token}`
    } catch (err) {
      win?.close()
      alert(err.response?.data?.error || 'No se pudo abrir la vista de empresa')
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>
  if (!ticket) return <div className="page-loading">Ticket no encontrado</div>

  const mensajes = ticket.mensajes || []
  const completado = ticket.estado === 'COMPLETADO'

  return (
    <div className="pro-ticket-page">
      <button className="btn-back" onClick={() => navigate('/panel')}>← Volver al panel</button>

      <div className="pro-ticket-layout">

        {/* ── Columna principal ── */}
        <div className="pro-ticket-main">

          {/* Hero */}
          <div className="ticket-hero">
            <span className="ticket-tipo-tag">{ticket.tipo}</span>
            <h1>{ticket.asunto}</h1>
            <p className="ticket-meta-line">
              <strong>{ticket.empresas?.nombre}</strong>
              <span className="muted">·</span>
              <span className="muted">{new Date(ticket.created_at).toLocaleString('es-CO')}</span>
            </p>
          </div>

          {/* Descripción */}
          <div className="ticket-descripcion">
            <p className="section-label">Descripción</p>
            <p>{ticket.descripcion}</p>
          </div>

          {/* Archivos */}
          <div className="archivos-section">
            <p className="section-label">Archivos adjuntos ({archivos.length})</p>
            {archivos.length > 0 && (
              <div className="archivos-grid">
                {archivos.map(a => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="archivo-chip">
                    <FileIcon mime={a.tipo_mime} />
                    <span className="archivo-chip-nombre">{a.nombre_original}</span>
                    <span className="t-xs muted">{formatBytes(a.tamanio)}</span>
                  </a>
                ))}
              </div>
            )}
            {!completado && (
              <>
                <input ref={fileRef} type="file" id="pro-file" className="file-input-hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt"
                  onChange={handleFile} />
                <label htmlFor="pro-file" className={`btn-upload-sm ${uploading ? 'loading' : ''}`}>
                  {uploading
                    ? <><span className="btn-spinner-sm" /> Subiendo...</>
                    : <>
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4-4 4M12 4v12" />
                        </svg>
                        Adjuntar archivo
                      </>}
                </label>
              </>
            )}
          </div>

          {/* Conversación */}
          <div className="conv-card">
            <p className="section-label">Conversación ({mensajes.length})</p>
            <div className="mensajes-hilo">
              {mensajes.length === 0 && <p className="conv-empty">Sin mensajes aún.</p>}
              {mensajes.map(m => (
                <div key={m.id} className={`hilo-msg ${m.autor_tipo === 'PROFESIONAL' ? 'msg-pro' : 'msg-emp'} ${m.es_interno ? 'msg-interno' : ''}`}>
                  {m.es_interno && <span className="interno-tag">Nota interna</span>}
                  <div className="hilo-header">
                    <span className="hilo-autor">{m.autor_nombre}</span>
                    <span className="hilo-fecha">{new Date(m.created_at).toLocaleString('es-CO', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                  <p className="hilo-body">{m.contenido}</p>
                </div>
              ))}
            </div>
            {!completado && (
              <form className="reply-bar" onSubmit={enviar}>
                <textarea rows={2}
                  placeholder={esInterno ? 'Nota interna (invisible para el cliente)...' : 'Responder al cliente...'}
                  value={mensaje} onChange={e => setMensaje(e.target.value)}
                  className={esInterno ? 'internal-input' : ''}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(e) } }}
                />
                <div className="reply-bar-foot">
                  <label className="interno-toggle">
                    <input type="checkbox" checked={esInterno} onChange={e => setEsInterno(e.target.checked)} />
                    Nota interna
                  </label>
                  <button type="submit" className="btn-send" disabled={sending || !mensaje.trim()}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ── Columna lateral ── */}
        <aside className="pro-ticket-sidebar">

          {/* Estado */}
          <div className="sidebar-card">
            <p className="section-label">Estado</p>
            <div className="estado-btns">
              {ESTADOS.map(s => (
                <button key={s}
                  className={`estado-btn ${ticket.estado === s ? 'estado-active' : ''}`}
                  onClick={() => cambiarEstado(s)}>
                  {ESTADO_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Asignar */}
          <div className="sidebar-card">
            <p className="section-label">Asignado a</p>
            <select value={ticket.asignado_a || ''} onChange={e => asignar(e.target.value || null)} className="asignar-select">
              <option value="">Sin asignar</option>
              {profesionales.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.especialidad})</option>
              ))}
            </select>
          </div>

          {/* Empresa — datos de acceso */}
          {empresa && (
            <div className="sidebar-card empresa-card">
              <p className="section-label">Cliente</p>
              <p className="empresa-nombre-big">{empresa.empresa?.nombre}</p>

              {/* Acceso a la cuenta */}
              <div className="acceso-box">
                <p className="acceso-label">Acceso a la cuenta</p>
                <div className="acceso-row">
                  <span className="acceso-key">Email</span>
                  <span className="acceso-val" title={empresa.empresa?.email}>{empresa.empresa?.email}</span>
                </div>
                <div className="acceso-row">
                  <span className="acceso-key">NIT</span>
                  <span className="acceso-val">{empresa.empresa?.nit}</span>
                </div>
                {empresa.empresa?.telefono && (
                  <div className="acceso-row">
                    <span className="acceso-key">Tel.</span>
                    <span className="acceso-val">{empresa.empresa.telefono}</span>
                  </div>
                )}

              </div>

              <button className="btn-ver-empresa" onClick={abrirVistaEmpresa}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Ver empresa
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{marginLeft:'auto',opacity:.5}}>
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </button>

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
                  <p className="section-label" style={{ marginTop: '.85rem' }}>Facturas recientes</p>
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
