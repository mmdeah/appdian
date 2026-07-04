import { useState, useEffect, useRef, useCallback } from 'react'
import { cotizacionesApi, productsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { printCotizacion } from '../utils/printCotizacion'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import './Cotizaciones.css'

// ── Helpers ──────────────────────────────────────────────────────────────────
const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const DATE = (s) =>
  new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

const ESTADOS = ['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA']

const ESTADO_NEXT = {
  BORRADOR  : ['ENVIADA', 'VENCIDA'],
  ENVIADA   : ['ACEPTADA', 'RECHAZADA', 'VENCIDA'],
  ACEPTADA  : [],
  RECHAZADA : [],
  VENCIDA   : [],
}

const ITEM_EMPTY = () => ({
  _id             : Math.random(),
  descripcion     : '',
  cantidad        : 1,
  precio_unitario : 0,
  iva_porcentaje  : 0,
  subtotal        : 0,
  _query          : '',
  _suggestions    : [],
  _showSug        : false,
})

// ── Item row with catalog search ─────────────────────────────────────────────
function ItemRow({ item, catalogo, onChange, onRemove }) {
  const [query,    setQuery]    = useState(item._query || '')
  const [sugs,     setSugs]     = useState([])
  const [showSugs, setShowSugs] = useState(false)
  const wrapRef = useRef(null)

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSugs(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleQuery(val) {
    setQuery(val)
    onChange({ ...item, descripcion: val, _query: val })
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
    const sub    = Math.round(parseFloat(item.cantidad || 1) * precio * 100) / 100
    const next   = { ...item, descripcion: prod.nombre, precio_unitario: precio, iva_porcentaje: iva, subtotal: sub, _query: prod.nombre }
    setQuery(prod.nombre)
    setShowSugs(false)
    onChange(next)
  }

  function handleNum(field, raw) {
    const val = parseFloat(raw) || 0
    const next = { ...item, [field]: val }
    next.subtotal = Math.round(next.cantidad * next.precio_unitario * 100) / 100
    onChange(next)
  }

  return (
    <tr>
      {/* Descripción con búsqueda */}
      <td className="cot-item-desc" ref={wrapRef}>
        <input
          className="cot-input"
          placeholder="Busca en catálogo o escribe libremente…"
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={() => sugs.length > 0 && setShowSugs(true)}
        />
        {showSugs && (
          <ul className="cot-suggestions">
            {sugs.map(p => (
              <li key={p.id} onMouseDown={() => selectCatalog(p)}>
                <span className="sug-nombre">{p.nombre}</span>
                <span className="sug-precio">{COP(p.precio_venta || p.precio)}</span>
              </li>
            ))}
          </ul>
        )}
      </td>
      <td>
        <input
          className="cot-input cot-input--num"
          type="number" min="0.001" step="0.001"
          value={item.cantidad}
          onChange={(e) => handleNum('cantidad', e.target.value)}
        />
      </td>
      <td>
        <input
          className="cot-input cot-input--num"
          type="number" min="0" step="100"
          value={item.precio_unitario}
          onChange={(e) => handleNum('precio_unitario', e.target.value)}
        />
      </td>
      <td>
        <select
          className="cot-input cot-input--num"
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
      </td>
      <td className="cot-subtotal">{COP(item.subtotal)}</td>
      <td>
        <button className="cot-rm-btn" onClick={onRemove} title="Eliminar ítem">✕</button>
      </td>
    </tr>
  )
}

// ── Create form ───────────────────────────────────────────────────────────────
function CreateForm({ catalogo, onSaved, onCancel }) {
  const [consumidorFinal, setConsumidorFinal] = useState(true)
  const [cliente, setCliente] = useState({ nombre: '', nit: '', email: '', telefono: '' })
  const [validez,  setValidez]  = useState(30)
  const [notas,    setNotas]    = useState('')
  const [items,    setItems]    = useState([ITEM_EMPTY()])
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')

  const updateItem = useCallback((idx, next) => {
    setItems(prev => prev.map((it, i) => i === idx ? next : it))
  }, [])

  const removeItem = useCallback((idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }, [])

  // Totales
  const subtotal = items.reduce((s, it) => s + (it.subtotal || 0), 0)
  const iva      = items.reduce((s, it) => s + Math.round(it.subtotal * (it.iva_porcentaje / 100) * 100) / 100, 0)
  const total    = Math.round((subtotal + iva) * 100) / 100

  async function handleSave() {
    setErr('')
    const validItems = items.filter(it => it.descripcion.trim())
    if (validItems.length === 0) return setErr('Agrega al menos un ítem con descripción.')

    setSaving(true)
    try {
      const payload = {
        cliente_nombre   : consumidorFinal ? 'Consumidor Final' : (cliente.nombre.trim() || 'Consumidor Final'),
        cliente_nit      : consumidorFinal ? null : (cliente.nit.trim() || null),
        cliente_email    : consumidorFinal ? null : (cliente.email.trim() || null),
        cliente_telefono : consumidorFinal ? null : (cliente.telefono.trim() || null),
        validez_dias     : parseInt(validez) || 30,
        notas            : notas.trim() || null,
        items            : validItems.map(it => ({
          descripcion     : it.descripcion,
          cantidad        : it.cantidad,
          precio_unitario : it.precio_unitario,
          iva_porcentaje  : it.iva_porcentaje,
        })),
      }
      const { data } = await cotizacionesApi.crear(payload)
      onSaved(data)
    } catch (e) {
      setErr(e?.response?.data?.error || 'Error al guardar la cotización.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cot-form-wrap">
      <div className="cot-form-header">
        <h2 className="cot-form-title">Nueva cotización</h2>
        <button className="cot-close-btn" onClick={onCancel}>✕</button>
      </div>

      {/* ── Cliente ── */}
      <div className="cot-section">
        <div className="cot-section-label">Cliente</div>
        <div className="cot-toggle-row">
          <button
            className={`cot-toggle ${consumidorFinal ? 'cot-toggle--active' : ''}`}
            onClick={() => setConsumidorFinal(true)}
          >
            Consumidor Final
          </button>
          <button
            className={`cot-toggle ${!consumidorFinal ? 'cot-toggle--active' : ''}`}
            onClick={() => setConsumidorFinal(false)}
          >
            Cliente específico
          </button>
        </div>

        {!consumidorFinal && (
          <div className="cot-client-grid">
            <div className="cot-field">
              <label className="cot-label">Nombre / Razón social *</label>
              <input className="cot-input" value={cliente.nombre}
                onChange={e => setCliente(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Empresa o persona" />
            </div>
            <div className="cot-field">
              <label className="cot-label">NIT / CC</label>
              <input className="cot-input" value={cliente.nit}
                onChange={e => setCliente(p => ({ ...p, nit: e.target.value }))}
                placeholder="Ej: 900123456-1" />
            </div>
            <div className="cot-field">
              <label className="cot-label">Email</label>
              <input className="cot-input" type="email" value={cliente.email}
                onChange={e => setCliente(p => ({ ...p, email: e.target.value }))}
                placeholder="cliente@empresa.com" />
            </div>
            <div className="cot-field">
              <label className="cot-label">Teléfono</label>
              <input className="cot-input" type="tel" value={cliente.telefono}
                onChange={e => setCliente(p => ({ ...p, telefono: e.target.value }))}
                placeholder="300 000 0000" />
            </div>
          </div>
        )}
      </div>

      {/* ── Ítems ── */}
      <div className="cot-section">
        <div className="cot-section-label">Ítems</div>
        <div className="cot-table-wrap">
          <table className="cot-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th style={{ width: 90 }}>Cantidad</th>
                <th style={{ width: 130 }}>Precio unit.</th>
                <th style={{ width: 80 }}>IVA</th>
                <th style={{ width: 130 }}>Subtotal</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <ItemRow
                  key={it._id}
                  item={it}
                  catalogo={catalogo}
                  onChange={(next) => updateItem(idx, next)}
                  onRemove={() => removeItem(idx)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <button className="cot-add-item-btn" onClick={() => setItems(p => [...p, ITEM_EMPTY()])}>
          + Agregar ítem
        </button>
      </div>

      {/* ── Totales ── */}
      <div className="cot-totals-row">
        <div className="cot-total-item">
          <span>Subtotal</span><strong>{COP(subtotal)}</strong>
        </div>
        <div className="cot-total-item">
          <span>IVA</span><strong>{COP(iva)}</strong>
        </div>
        <div className="cot-total-item cot-total-grand">
          <span>TOTAL</span><strong>{COP(total)}</strong>
        </div>
      </div>

      {/* ── Opciones ── */}
      <div className="cot-section">
        <div className="cot-opts-row">
          <div className="cot-field">
            <label className="cot-label">Validez (días)</label>
            <input className="cot-input cot-input--sm" type="number" min="1" max="365"
              value={validez} onChange={e => setValidez(e.target.value)} />
          </div>
          <div className="cot-field cot-field--grow">
            <label className="cot-label">Notas / condiciones</label>
            <textarea className="cot-textarea" rows={2} value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Precios sujetos a cambio sin previo aviso. Incluye instalación." />
          </div>
        </div>
      </div>

      {err && <p className="cot-err">{err}</p>}

      <div className="cot-form-actions">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Guardando…' : '✓ Guardar cotización'}
        </Button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Cotizaciones() {
  const { empresa } = useAuth()
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [creating,     setCreating]     = useState(false)
  const [printing,     setPrinting]     = useState(null)
  const [changingEst,  setChangingEst]  = useState(null)
  const [catalogo,     setCatalogo]     = useState([])
  const [filters,      setFilters]      = useState({ estado: '' })
  const [expanded,     setExpanded]     = useState(null)

  // Load catalog on mount (for item search)
  useEffect(() => {
    productsApi.list().then(({ data }) => setCatalogo(data.products || [])).catch(() => {})
  }, [])

  function load(f = filters) {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v))
    cotizacionesApi.listar(params)
      .then(({ data }) => setCotizaciones(data.cotizaciones || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

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
    if (!confirm('¿Eliminar esta cotización? Esta acción no se puede deshacer.')) return
    try {
      await cotizacionesApi.eliminar(cotId)
      setCotizaciones(prev => prev.filter(c => c.id !== cotId))
      if (expanded === cotId) setExpanded(null)
    } catch { alert('Error al eliminar la cotización.') }
  }

  const totalMonto = cotizaciones.reduce((s, c) => s + (c.total || 0), 0)

  return (
    <div className="cot-page">

      {/* ── Formulario de creación (overlay) ── */}
      {creating && (
        <div className="cot-overlay">
          <CreateForm
            catalogo={catalogo}
            onSaved={handleSaved}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {/* ── Cabecera ── */}
      <div className="cot-page-header">
        <div>
          <h1 className="cot-page-title">Cotizaciones</h1>
          <p className="cot-page-sub">Genera y gestiona propuestas comerciales</p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + Nueva cotización
        </Button>
      </div>

      {/* ── Resumen ── */}
      {!loading && cotizaciones.length > 0 && (
        <div className="cot-summary">
          <div className="cot-sum-card">
            <span className="cot-sum-label">Total cotizaciones</span>
            <span className="cot-sum-value">{cotizaciones.length}</span>
          </div>
          <div className="cot-sum-card">
            <span className="cot-sum-label">Monto total</span>
            <span className="cot-sum-value">{COP(totalMonto)}</span>
          </div>
          <div className="cot-sum-card">
            <span className="cot-sum-label">Aceptadas</span>
            <span className="cot-sum-value cot-sum--green">
              {cotizaciones.filter(c => c.estado === 'ACEPTADA').length}
            </span>
          </div>
          <div className="cot-sum-card">
            <span className="cot-sum-label">Pendientes</span>
            <span className="cot-sum-value cot-sum--yellow">
              {cotizaciones.filter(c => ['BORRADOR', 'ENVIADA'].includes(c.estado)).length}
            </span>
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="cot-filters card">
        <div className="filter-group">
          <label className="filter-label caps muted">Estado</label>
          <select className="filter-select" value={filters.estado}
            onChange={e => { const f = { ...filters, estado: e.target.value }; setFilters(f); load(f) }}>
            <option value="">Todos</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setFilters({ estado: '' }); load({ estado: '' }) }}>
          Limpiar
        </Button>
        <div style={{ marginLeft: 'auto' }}>
          <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
            + Nueva
          </Button>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="card table-card">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : cotizaciones.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
              <path d="M9 12h6m-3-3v6M4 6h16M4 10h16M4 14h10" />
            </svg>
            <p>Aún no hay cotizaciones. ¡Crea la primera!</p>
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
                    <td>
                      <span className="inv-num">COT-{String(cot.numero_cotizacion).padStart(4,'0')}</span>
                    </td>
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
                          onClick={() => handlePrint(cot.id)}
                          title="Imprimir / Guardar PDF">
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
                        <Button variant="ghost" size="sm"
                          onClick={() => handleEliminar(cot.id)}>
                          🗑
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {expanded === cot.id && (
                    <tr key={`${cot.id}-det`} className="detail-row">
                      <td colSpan={6}>
                        <CotDetail id={cot.id} empresa={empresa} />
                      </td>
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

// ── Inline detail (fetches items lazily) ─────────────────────────────────────
function CotDetail({ id, empresa }) {
  const [cot, setCot] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cotizacionesApi.obtener(id)
      .then(({ data }) => setCot(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="cot-detail-loading"><div className="spinner" /></div>
  if (!cot) return null

  const items = cot.items_cotizacion || []

  return (
    <div className="cot-detail">
      <div className="cot-detail-meta">
        {cot.cliente_email    && <span><strong>Email:</strong> {cot.cliente_email}</span>}
        {cot.cliente_telefono && <span><strong>Tel:</strong> {cot.cliente_telefono}</span>}
        <span><strong>Validez:</strong> {cot.validez_dias} días</span>
        {cot.notas && <span><strong>Notas:</strong> {cot.notas}</span>}
      </div>
      {items.length > 0 && (
        <table className="cot-detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Descripción</th>
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
      )}
      <div className="cot-detail-totals">
        <span>Base: <strong>{COP(cot.subtotal)}</strong></span>
        <span>IVA: <strong>{COP(cot.iva)}</strong></span>
        <span className="cot-detail-grand">TOTAL: <strong>{COP(cot.total)}</strong></span>
      </div>
    </div>
  )
}
