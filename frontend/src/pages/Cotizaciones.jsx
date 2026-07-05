import { useState, useEffect, useRef, useCallback } from 'react'
import { cotizacionesApi, productsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { printCotizacion } from '../utils/printCotizacion'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import './Cotizaciones.css'

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const DATE = (s) =>
  new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

const ESTADO_NEXT = {
  BORRADOR  : ['ENVIADA', 'VENCIDA'],
  ENVIADA   : ['ACEPTADA', 'RECHAZADA', 'VENCIDA'],
  ACEPTADA  : [],
  RECHAZADA : [],
  VENCIDA   : [],
}

const ITEM_EMPTY = () => ({
  _id: Math.random(),
  descripcion: '',
  cantidad: 1,
  precio_unitario: 0,
  iva_porcentaje: 0,
  subtotal: 0,
})

// ── Celdas de un ítem — se renderizan como hijos directos del grid ────────────
// React Fragment: los 6 divs caen directamente en el grid del padre
function ItemCells({ item, catalogo, onChange, onRemove }) {
  const [query,    setQuery]    = useState(item.descripcion || '')
  const [sugs,     setSugs]     = useState([])
  const [showSugs, setShowSugs] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSugs(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function handleQuery(val) {
    setQuery(val)
    onChange({ ...item, descripcion: val })
    if (val.trim()) {
      const q = val.toLowerCase()
      const found = catalogo.filter(p =>
        p.nombre?.toLowerCase().includes(q) || p.referencia?.toLowerCase().includes(q)
      ).slice(0, 6)
      setSugs(found)
      setShowSugs(found.length > 0)
    } else {
      setSugs([]); setShowSugs(false)
    }
  }

  function pick(prod) {
    const precio = parseFloat(prod.precio_venta || prod.precio || 0)
    const iva    = parseFloat(prod.iva_porcentaje || 0)
    const sub    = Math.round(item.cantidad * precio * 100) / 100
    setQuery(prod.nombre); setShowSugs(false)
    onChange({ ...item, descripcion: prod.nombre, precio_unitario: precio, iva_porcentaje: iva, subtotal: sub })
  }

  function num(field, raw) {
    const val = parseFloat(raw) || 0
    const next = { ...item, [field]: val }
    next.subtotal = Math.round(next.cantidad * next.precio_unitario * 100) / 100
    onChange(next)
  }

  return (
    <>
      {/* col 1 — descripción */}
      <div className="cot-cell cot-cell--desc" ref={wrapRef}>
        <input
          className="cot-inp"
          placeholder="Busca en catálogo o escribe…"
          value={query}
          onChange={e => handleQuery(e.target.value)}
          onFocus={() => sugs.length > 0 && setShowSugs(true)}
        />
        {showSugs && (
          <ul className="cot-sugs">
            {sugs.map(p => (
              <li key={p.id} onMouseDown={() => pick(p)}>
                <span>{p.nombre}</span>
                <span className="cot-sug-p">{COP(p.precio_venta || p.precio)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* col 2 — cantidad */}
      <div className="cot-cell">
        <input className="cot-inp cot-inp--r" type="number" min="0.001" step="1"
          value={item.cantidad} onChange={e => num('cantidad', e.target.value)} />
      </div>

      {/* col 3 — precio */}
      <div className="cot-cell">
        <input className="cot-inp cot-inp--r" type="number" min="0" step="1000"
          value={item.precio_unitario} onChange={e => num('precio_unitario', e.target.value)} />
      </div>

      {/* col 4 — IVA */}
      <div className="cot-cell">
        <select className="cot-inp cot-inp--r" value={item.iva_porcentaje}
          onChange={e => onChange({ ...item, iva_porcentaje: parseFloat(e.target.value) })}>
          <option value={0}>0 %</option>
          <option value={5}>5 %</option>
          <option value={19}>19 %</option>
        </select>
      </div>

      {/* col 5 — subtotal */}
      <div className="cot-cell cot-cell--sub">{COP(item.subtotal)}</div>

      {/* col 6 — eliminar */}
      <div className="cot-cell cot-cell--rm">
        <button className="cot-rm" onClick={onRemove}>✕</button>
      </div>
    </>
  )
}

// ── Modal de creación ─────────────────────────────────────────────────────────
function CreateModal({ catalogo, onSaved, onClose }) {
  const [consumidorFinal, setConsumidorFinal] = useState(true)
  const [cliente, setCliente] = useState({ nombre: '', nit: '', email: '', telefono: '' })
  const [validez, setValidez] = useState(30)
  const [notas,   setNotas]   = useState('')
  const [items,   setItems]   = useState([ITEM_EMPTY()])
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  const updateItem = useCallback((idx, next) =>
    setItems(prev => prev.map((it, i) => i === idx ? next : it)), [])
  const removeItem = useCallback((idx) =>
    setItems(prev => prev.filter((_, i) => i !== idx)), [])

  const subtotal = items.reduce((s, it) => s + (it.subtotal || 0), 0)
  const iva      = items.reduce((s, it) =>
    s + Math.round(it.subtotal * (it.iva_porcentaje / 100) * 100) / 100, 0)
  const total    = Math.round((subtotal + iva) * 100) / 100

  async function save() {
    setErr('')
    const valid = items.filter(it => it.descripcion.trim())
    if (!valid.length) return setErr('Agrega al menos un ítem.')
    setSaving(true)
    try {
      const { data } = await cotizacionesApi.crear({
        cliente_nombre   : consumidorFinal ? 'Consumidor Final' : (cliente.nombre.trim() || 'Consumidor Final'),
        cliente_nit      : consumidorFinal ? null : (cliente.nit.trim()      || null),
        cliente_email    : consumidorFinal ? null : (cliente.email.trim()    || null),
        cliente_telefono : consumidorFinal ? null : (cliente.telefono.trim() || null),
        validez_dias     : parseInt(validez) || 30,
        notas            : notas.trim() || null,
        items            : valid.map(it => ({
          descripcion: it.descripcion, cantidad: it.cantidad,
          precio_unitario: it.precio_unitario, iva_porcentaje: it.iva_porcentaje,
        })),
      })
      onSaved(data)
    } catch (e) {
      setErr(e?.response?.data?.error || 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const setC = (k) => (e) => setCliente(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="cot-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cot-modal">

        {/* Header */}
        <div className="cot-mhd">
          <h2>Nueva cotización</h2>
          <button className="cot-x" onClick={onClose}>✕</button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="cot-mbody">

          {/* — Cliente — */}
          <div className="cot-sec">
            <p className="cot-sec-lbl">Cliente</p>
            <div className="cot-toggle">
              <button className={consumidorFinal ? 'on' : ''} onClick={() => setConsumidorFinal(true)}>
                Consumidor final
              </button>
              <button className={!consumidorFinal ? 'on' : ''} onClick={() => setConsumidorFinal(false)}>
                Cliente específico
              </button>
            </div>
            {!consumidorFinal && (
              <div className="cot-g2">
                <div className="cot-f"><label>Nombre / Razón social</label>
                  <input className="cot-inp" placeholder="Empresa o persona" value={cliente.nombre} onChange={setC('nombre')} /></div>
                <div className="cot-f"><label>NIT / CC</label>
                  <input className="cot-inp" placeholder="900123456-1" value={cliente.nit} onChange={setC('nit')} /></div>
                <div className="cot-f"><label>Email</label>
                  <input className="cot-inp" type="email" placeholder="cliente@empresa.com" value={cliente.email} onChange={setC('email')} /></div>
                <div className="cot-f"><label>Teléfono</label>
                  <input className="cot-inp" type="tel" placeholder="300 000 0000" value={cliente.telefono} onChange={setC('telefono')} /></div>
              </div>
            )}
          </div>

          {/* — Ítems (CSS Grid) — */}
          <div className="cot-sec">
            <p className="cot-sec-lbl">Ítems</p>

            {/* Grid: 6 columnas — el header y los ítems comparten el mismo grid */}
            <div className="cot-grid">
              {/* Header */}
              <div className="cot-gh">Descripción</div>
              <div className="cot-gh cot-gh--r">Cant.</div>
              <div className="cot-gh cot-gh--r">Precio unit.</div>
              <div className="cot-gh cot-gh--r">IVA</div>
              <div className="cot-gh cot-gh--r">Subtotal</div>
              <div></div>

              {/* Filas de ítems */}
              {items.map((it, idx) => (
                <ItemCells
                  key={it._id}
                  item={it}
                  catalogo={catalogo}
                  onChange={(next) => updateItem(idx, next)}
                  onRemove={() => removeItem(idx)}
                />
              ))}
            </div>

            <button className="cot-add" onClick={() => setItems(p => [...p, ITEM_EMPTY()])}>
              + Agregar ítem
            </button>
          </div>

          {/* — Totales — */}
          <div className="cot-totals">
            <div className="cot-tl"><span>Subtotal</span><span>{COP(subtotal)}</span></div>
            <div className="cot-tl"><span>IVA</span><span>{COP(iva)}</span></div>
            <div className="cot-tl cot-tl--g"><span>TOTAL</span><span>{COP(total)}</span></div>
          </div>

          {/* — Extras — */}
          <div className="cot-sec cot-extras">
            <div className="cot-f" style={{ width: 110 }}>
              <label>Válida (días)</label>
              <input className="cot-inp" type="number" min="1" max="365"
                value={validez} onChange={e => setValidez(e.target.value)} style={{ textAlign:'right' }} />
            </div>
            <div className="cot-f" style={{ flex: 1 }}>
              <label>Notas / condiciones</label>
              <input className="cot-inp" placeholder="Ej: Precios sujetos a cambio."
                value={notas} onChange={e => setNotas(e.target.value)} />
            </div>
          </div>

          {err && <p className="cot-err">{err}</p>}
        </div>

        {/* Footer */}
        <div className="cot-mft">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={saving} onClick={save}>
            {saving ? 'Guardando…' : '✓ Guardar cotización'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Detail expandido ──────────────────────────────────────────────────────────
function CotDetail({ id }) {
  const [cot, setCot] = useState(null)
  useEffect(() => {
    cotizacionesApi.obtener(id).then(({ data }) => setCot(data)).catch(() => {})
  }, [id])

  if (!cot) return <div style={{ display:'flex', justifyContent:'center', padding:16 }}><div className="spinner" /></div>

  const items = cot.items_cotizacion || []
  return (
    <div className="cot-detail">
      {(cot.cliente_email || cot.cliente_telefono || cot.notas) && (
        <div className="cot-dmeta">
          {cot.cliente_email    && <span><b>Email:</b> {cot.cliente_email}</span>}
          {cot.cliente_telefono && <span><b>Tel:</b> {cot.cliente_telefono}</span>}
          {cot.notas            && <span><b>Notas:</b> {cot.notas}</span>}
          <span><b>Validez:</b> {cot.validez_dias} días</span>
        </div>
      )}
      <table className="cot-dtable">
        <thead>
          <tr>
            <th>#</th><th>Descripción</th>
            <th className="td-right">Cant.</th>
            <th className="td-right">Precio</th>
            <th className="td-right">IVA</th>
            <th className="td-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id}>
              <td className="muted t-xs">{i + 1}</td>
              <td>{it.descripcion}</td>
              <td className="td-right t-sm">{Number(it.cantidad).toLocaleString('es-CO')}</td>
              <td className="td-right t-sm">{COP(it.precio_unitario)}</td>
              <td className="td-right t-sm">{it.iva_porcentaje}%</td>
              <td className="td-right td-price">{COP(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="cot-dtotals">
        <span>Base: <b>{COP(cot.subtotal)}</b></span>
        <span>IVA: <b>{COP(cot.iva)}</b></span>
        <span>TOTAL: <b style={{ color:'var(--primary)' }}>{COP(cot.total)}</b></span>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function Cotizaciones() {
  const { empresa }  = useAuth()
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [creating,     setCreating]     = useState(false)
  const [printing,     setPrinting]     = useState(null)
  const [changingEst,  setChangingEst]  = useState(null)
  const [catalogo,     setCatalogo]     = useState([])
  const [expanded,     setExpanded]     = useState(null)

  useEffect(() => {
    productsApi.list().then(({ data }) => setCatalogo(data.products || [])).catch(() => {})
    cotizacionesApi.listar({})
      .then(({ data }) => setCotizaciones(data.cotizaciones || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleSaved(cot) { setCreating(false); setCotizaciones(prev => [cot, ...prev]) }

  async function handlePrint(cotId) {
    setPrinting(cotId)
    try { const { data } = await cotizacionesApi.obtener(cotId); printCotizacion(data, empresa || {}) }
    catch { alert('No se pudo cargar la cotización.') }
    finally { setPrinting(null) }
  }

  async function handleEstado(cotId, estado) {
    setChangingEst(cotId)
    try {
      const { data } = await cotizacionesApi.cambiarEstado(cotId, estado)
      setCotizaciones(prev => prev.map(c => c.id === cotId ? { ...c, ...data } : c))
    } catch { alert('Error al cambiar el estado.') }
    finally { setChangingEst(null) }
  }

  async function handleEliminar(cotId) {
    if (!confirm('¿Eliminar esta cotización?')) return
    try {
      await cotizacionesApi.eliminar(cotId)
      setCotizaciones(prev => prev.filter(c => c.id !== cotId))
      if (expanded === cotId) setExpanded(null)
    } catch { alert('Error al eliminar.') }
  }

  return (
    <div className="cot-page">
      {creating && <CreateModal catalogo={catalogo} onSaved={handleSaved} onClose={() => setCreating(false)} />}

      <div className="cot-header">
        <div>
          <h1 className="cot-title">Cotizaciones</h1>
          <p className="cot-sub">
            {cotizaciones.length > 0
              ? `${cotizaciones.length} cotización${cotizaciones.length !== 1 ? 'es' : ''}`
              : 'Crea tu primera cotización'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>+ Nueva cotización</Button>
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : cotizaciones.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4" />
            </svg>
            <p>Aún no hay cotizaciones</p>
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>+ Nueva cotización</Button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th><th>Cliente</th>
                <th className="td-right">Total</th>
                <th>Estado</th><th>Fecha</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map(cot => (
                <>
                  <tr key={cot.id} className={expanded === cot.id ? 'row-expanded' : ''}>
                    <td><span className="inv-num">COT-{String(cot.numero_cotizacion).padStart(4,'0')}</span></td>
                    <td>
                      <p className="td-main">{cot.cliente_nombre || 'Consumidor Final'}</p>
                      {cot.cliente_nit && <p className="td-sub muted t-xs">NIT {cot.cliente_nit}</p>}
                    </td>
                    <td className="td-price td-right">{COP(cot.total)}</td>
                    <td><Badge variant={cot.estado}>{cot.estado}</Badge></td>
                    <td className="muted t-xs">{DATE(cot.created_at)}</td>
                    <td>
                      <div className="action-btns">
                        <Button variant="ghost" size="sm"
                          onClick={() => setExpanded(p => p === cot.id ? null : cot.id)}>
                          {expanded === cot.id ? 'Cerrar' : 'Ver'}
                        </Button>
                        <Button variant="secondary" size="sm"
                          disabled={printing === cot.id} onClick={() => handlePrint(cot.id)}>
                          {printing === cot.id ? '…' : '🖨️ PDF'}
                        </Button>
                        {ESTADO_NEXT[cot.estado]?.length > 0 && (
                          <select className="cot-state-sel" disabled={changingEst === cot.id}
                            value="" onChange={e => e.target.value && handleEstado(cot.id, e.target.value)}>
                            <option value="">Estado ▾</option>
                            {ESTADO_NEXT[cot.estado].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                        <button className="cot-del" onClick={() => handleEliminar(cot.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                  {expanded === cot.id && (
                    <tr key={`${cot.id}-d`} className="detail-row">
                      <td colSpan={6}><CotDetail id={cot.id} /></td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
