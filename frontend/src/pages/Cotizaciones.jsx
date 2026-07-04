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

// ── Fila de ítem ─────────────────────────────────────────────────────────────
function ItemRow({ item, catalogo, onChange, onRemove, isLast }) {
  const [query,    setQuery]    = useState(item.descripcion || '')
  const [sugs,     setSugs]     = useState([])
  const [showSugs, setShowSugs] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSugs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleQuery(val) {
    setQuery(val)
    onChange({ ...item, descripcion: val })
    if (val.trim().length >= 1) {
      const q = val.toLowerCase()
      const found = catalogo.filter(p =>
        p.nombre?.toLowerCase().includes(q) || p.referencia?.toLowerCase().includes(q)
      ).slice(0, 6)
      setSugs(found)
      setShowSugs(found.length > 0)
    } else {
      setSugs([])
      setShowSugs(false)
    }
  }

  function selectCatalog(prod) {
    const precio = parseFloat(prod.precio_venta || prod.precio || 0)
    const iva    = parseFloat(prod.iva_porcentaje || 0)
    const sub    = Math.round(item.cantidad * precio * 100) / 100
    setQuery(prod.nombre)
    setShowSugs(false)
    onChange({ ...item, descripcion: prod.nombre, precio_unitario: precio, iva_porcentaje: iva, subtotal: sub })
  }

  function handleNum(field, raw) {
    const val = parseFloat(raw) || 0
    const next = { ...item, [field]: val }
    next.subtotal = Math.round(next.cantidad * next.precio_unitario * 100) / 100
    onChange(next)
  }

  return (
    <div className={`cot-item-row ${isLast ? 'cot-item-row--last' : ''}`}>
      {/* Descripción */}
      <div className="cot-item-desc" ref={wrapRef}>
        <input
          className="cot-field-input"
          placeholder="Descripción del producto o servicio…"
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={() => sugs.length > 0 && setShowSugs(true)}
        />
        {showSugs && (
          <ul className="cot-suggestions">
            {sugs.map(p => (
              <li key={p.id} onMouseDown={() => selectCatalog(p)}>
                <span>{p.nombre}</span>
                <span className="sug-precio">{COP(p.precio_venta || p.precio)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cantidad */}
      <input
        className="cot-field-input cot-field-input--num"
        type="number" min="0.001" step="1"
        value={item.cantidad}
        onChange={(e) => handleNum('cantidad', e.target.value)}
      />

      {/* Precio */}
      <input
        className="cot-field-input cot-field-input--num"
        type="number" min="0" step="1000"
        value={item.precio_unitario}
        onChange={(e) => handleNum('precio_unitario', e.target.value)}
      />

      {/* IVA */}
      <select
        className="cot-field-input cot-field-input--num"
        value={item.iva_porcentaje}
        onChange={(e) => {
          const val = parseFloat(e.target.value)
          onChange({ ...item, iva_porcentaje: val })
        }}
      >
        <option value={0}>0%</option>
        <option value={5}>5%</option>
        <option value={19}>19%</option>
      </select>

      {/* Subtotal */}
      <div className="cot-item-sub">{COP(item.subtotal)}</div>

      {/* Eliminar */}
      <button className="cot-rm" onClick={onRemove}>✕</button>
    </div>
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

  const updateItem = useCallback((idx, next) => {
    setItems(prev => prev.map((it, i) => i === idx ? next : it))
  }, [])

  const removeItem = useCallback((idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const subtotal = items.reduce((s, it) => s + (it.subtotal || 0), 0)
  const iva      = items.reduce((s, it) => s + Math.round(it.subtotal * (it.iva_porcentaje / 100) * 100) / 100, 0)
  const total    = Math.round((subtotal + iva) * 100) / 100

  async function handleSave() {
    setErr('')
    const validItems = items.filter(it => it.descripcion.trim())
    if (!validItems.length) return setErr('Agrega al menos un ítem con descripción.')
    setSaving(true)
    try {
      const { data } = await cotizacionesApi.crear({
        cliente_nombre   : consumidorFinal ? 'Consumidor Final' : (cliente.nombre.trim() || 'Consumidor Final'),
        cliente_nit      : consumidorFinal ? null : (cliente.nit.trim()      || null),
        cliente_email    : consumidorFinal ? null : (cliente.email.trim()    || null),
        cliente_telefono : consumidorFinal ? null : (cliente.telefono.trim() || null),
        validez_dias     : parseInt(validez) || 30,
        notas            : notas.trim() || null,
        items            : validItems.map(it => ({
          descripcion     : it.descripcion,
          cantidad        : it.cantidad,
          precio_unitario : it.precio_unitario,
          iva_porcentaje  : it.iva_porcentaje,
        })),
      })
      onSaved(data)
    } catch (e) {
      setErr(e?.response?.data?.error || 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cot-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cot-modal">

        {/* Header */}
        <div className="cot-modal-header">
          <h2>Nueva cotización</h2>
          <button className="cot-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Cliente */}
        <div className="cot-modal-section">
          <div className="cot-section-title">Cliente</div>
          <div className="cot-client-toggle">
            <button
              className={consumidorFinal ? 'active' : ''}
              onClick={() => setConsumidorFinal(true)}
            >
              Consumidor final
            </button>
            <button
              className={!consumidorFinal ? 'active' : ''}
              onClick={() => setConsumidorFinal(false)}
            >
              Cliente específico
            </button>
          </div>

          {!consumidorFinal && (
            <div className="cot-client-grid">
              <div className="cot-field">
                <label>Nombre / Razón social</label>
                <input className="cot-field-input" placeholder="Empresa o persona"
                  value={cliente.nombre} onChange={e => setCliente(p => ({ ...p, nombre: e.target.value }))} />
              </div>
              <div className="cot-field">
                <label>NIT / CC</label>
                <input className="cot-field-input" placeholder="900123456-1"
                  value={cliente.nit} onChange={e => setCliente(p => ({ ...p, nit: e.target.value }))} />
              </div>
              <div className="cot-field">
                <label>Email</label>
                <input className="cot-field-input" type="email" placeholder="cliente@empresa.com"
                  value={cliente.email} onChange={e => setCliente(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="cot-field">
                <label>Teléfono</label>
                <input className="cot-field-input" type="tel" placeholder="300 000 0000"
                  value={cliente.telefono} onChange={e => setCliente(p => ({ ...p, telefono: e.target.value }))} />
              </div>
            </div>
          )}
        </div>

        {/* Ítems */}
        <div className="cot-modal-section">
          <div className="cot-section-title">Ítems</div>

          <div className="cot-items-head">
            <span className="cot-col-desc">Descripción</span>
            <span className="cot-col-num">Cant.</span>
            <span className="cot-col-num">Precio</span>
            <span className="cot-col-num">IVA</span>
            <span className="cot-col-num">Subtotal</span>
            <span style={{ width: 28 }}></span>
          </div>

          <div className="cot-items-list">
            {items.map((it, idx) => (
              <ItemRow
                key={it._id}
                item={it}
                catalogo={catalogo}
                onChange={(next) => updateItem(idx, next)}
                onRemove={() => removeItem(idx)}
                isLast={idx === items.length - 1}
              />
            ))}
          </div>

          <button className="cot-add-btn" onClick={() => setItems(p => [...p, ITEM_EMPTY()])}>
            + Agregar ítem
          </button>
        </div>

        {/* Totales */}
        <div className="cot-totals">
          <div className="cot-total-line">
            <span>Subtotal</span>
            <span>{COP(subtotal)}</span>
          </div>
          <div className="cot-total-line">
            <span>IVA</span>
            <span>{COP(iva)}</span>
          </div>
          <div className="cot-total-line cot-total-line--grand">
            <span>TOTAL</span>
            <span>{COP(total)}</span>
          </div>
        </div>

        {/* Opciones extras */}
        <div className="cot-modal-section cot-extras">
          <div className="cot-field" style={{ width: 120 }}>
            <label>Válida (días)</label>
            <input className="cot-field-input cot-field-input--num" type="number" min="1" max="365"
              value={validez} onChange={e => setValidez(e.target.value)} />
          </div>
          <div className="cot-field" style={{ flex: 1 }}>
            <label>Notas / condiciones</label>
            <input className="cot-field-input" placeholder="Ej: Precios sujetos a cambio. Incluye instalación."
              value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
        </div>

        {err && <p className="cot-err">{err}</p>}

        {/* Acciones */}
        <div className="cot-modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={saving} onClick={handleSave}>
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

  if (!cot) return <div className="cot-detail-loading"><div className="spinner" /></div>

  const items = cot.items_cotizacion || []
  return (
    <div className="cot-detail">
      {(cot.cliente_email || cot.cliente_telefono || cot.notas) && (
        <div className="cot-detail-meta">
          {cot.cliente_email    && <span><b>Email:</b> {cot.cliente_email}</span>}
          {cot.cliente_telefono && <span><b>Tel:</b> {cot.cliente_telefono}</span>}
          {cot.notas            && <span><b>Notas:</b> {cot.notas}</span>}
          <span><b>Validez:</b> {cot.validez_dias} días</span>
        </div>
      )}
      <table className="cot-detail-table">
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
      <div className="cot-detail-totals">
        <span>Base: <b>{COP(cot.subtotal)}</b></span>
        <span>IVA: <b>{COP(cot.iva)}</b></span>
        <span>TOTAL: <b style={{ color: 'var(--primary)' }}>{COP(cot.total)}</b></span>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
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

  function handleSaved(cot) {
    setCreating(false)
    setCotizaciones(prev => [cot, ...prev])
  }

  async function handlePrint(cotId) {
    setPrinting(cotId)
    try {
      const { data } = await cotizacionesApi.obtener(cotId)
      printCotizacion(data, empresa || {})
    } catch { alert('No se pudo cargar la cotización.') }
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

      {creating && (
        <CreateModal
          catalogo={catalogo}
          onSaved={handleSaved}
          onClose={() => setCreating(false)}
        />
      )}

      {/* Cabecera */}
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

      {/* Tabla / empty */}
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
                <th>N°</th>
                <th>Cliente</th>
                <th className="td-right">Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.map(cot => (
                <>
                  <tr key={cot.id} className={expanded === cot.id ? 'row-expanded' : ''}>
                    <td><span className="inv-num">COT-{String(cot.numero_cotizacion).padStart(4, '0')}</span></td>
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
                          disabled={printing === cot.id}
                          onClick={() => handlePrint(cot.id)}>
                          {printing === cot.id ? '…' : '🖨️ PDF'}
                        </Button>
                        {ESTADO_NEXT[cot.estado]?.length > 0 && (
                          <select
                            className="cot-state-select"
                            disabled={changingEst === cot.id}
                            value=""
                            onChange={e => e.target.value && handleEstado(cot.id, e.target.value)}
                          >
                            <option value="">Estado ▾</option>
                            {ESTADO_NEXT[cot.estado].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}
                        <button className="cot-del-btn" onClick={() => handleEliminar(cot.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                  {expanded === cot.id && (
                    <tr key={`${cot.id}-det`} className="detail-row">
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
