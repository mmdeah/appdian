import { useState, useEffect, useCallback } from 'react'
import { inventarioApi } from '../api/client'
import PrecioInput from '../components/ui/PrecioInput'
import './Inventario.css'

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const UNIDADES_SERVICIO = ['SRV','HORA','HR','MIN','CONS','MES','DIA']
const UNIDADES_PRODUCTO = ['UND','KG','GR','L','ML','M','CM','CAJA','PAQUETE','ROLLO','PAR','DOCENA']
const CATEGORIAS_PROD   = ['GENERAL','MATERIA_PRIMA','PRODUCTO_TERMINADO','HERRAMIENTAS','PAPELERÍA','TECNOLOGÍA','REPUESTOS','OTROS']
const CATEGORIAS_SERV   = ['SERVICIO','CONSULTORÍA','ASESORÍA','FORMACIÓN','TRÁMITES','OTROS']

const esServicio = u => UNIDADES_SERVICIO.includes((u || '').toUpperCase())

function generarCodigo(allProductos, unidad) {
  const prefix = esServicio(unidad) ? 'SRV' : 'PROD'
  const nums = (allProductos || [])
    .map(p => p.codigo || '')
    .filter(c => c.startsWith(prefix + '-'))
    .map(c => parseInt(c.slice(prefix.length + 1)) || 0)
    .filter(n => n > 0)
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}

const EMPTY = {
  codigo: '', nombre: '', descripcion: '', categoria: 'GENERAL', unidad: 'UND',
  precio_costo: '0', precio: '0', iva_porcentaje: '19', stock_actual: '0', stock_minimo: '0',
}

// ── Badges ──────────────────────────────────────────────────────────────────
function StockBadge({ actual, minimo }) {
  if (actual <= 0)      return <span className="inv-badge inv-badge--sin">Sin stock</span>
  if (actual <= minimo) return <span className="inv-badge inv-badge--bajo">Bajo</span>
  return <span className="inv-badge inv-badge--ok">OK</span>
}

function ServicioBadge() {
  return <span className="inv-badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>Servicio</span>
}

// ── Modal producto / servicio ─────────────────────────────────────────────────
function ModalProducto({ prod, allProductos, onSave, onClose }) {
  const isNew = !prod?.id
  const [autoCode, setAutoCode] = useState(isNew)
  const [form, setForm] = useState(() =>
    isNew ? { ...EMPTY, codigo: generarCodigo(allProductos, EMPTY.unidad) } : prod
  )
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const isServ = esServicio(form.unidad)

  function handleUnidad(u) {
    const serv = esServicio(u)
    setForm(p => ({
      ...p,
      unidad   : u,
      codigo   : autoCode ? generarCodigo(allProductos, u) : p.codigo,
      categoria: serv
        ? (CATEGORIAS_SERV.includes(p.categoria) ? p.categoria : 'SERVICIO')
        : (CATEGORIAS_PROD.includes(p.categoria) ? p.categoria : 'GENERAL'),
    }))
  }

  function activarAuto() {
    setAutoCode(true)
    setForm(p => ({ ...p, codigo: generarCodigo(allProductos, p.unidad) }))
  }

  function activarManual() {
    setAutoCode(false)
    setForm(p => ({ ...p, codigo: '' }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, precio_venta: form.precio }
      if (form.id) await inventarioApi.actualizar(form.id, payload)
      else         await inventarioApi.crear(payload)
      onSave()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal" onClick={e => e.stopPropagation()}>
        <div className="inv-modal-head">
          <h3>{form.id ? 'Editar ítem' : 'Nuevo producto / servicio'}</h3>
          <button className="inv-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="inv-form">

          {/* ── Código con toggle Auto/Manual ── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Código</label>
              {isNew && (
                <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 2 }}>
                  {[['✦ Auto', true], ['Manual', false]].map(([label, val]) => (
                    <button key={label} type="button"
                      onClick={() => val ? activarAuto() : activarManual()}
                      style={{
                        padding: '2px 9px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        border: 'none', cursor: 'pointer', transition: 'all .15s',
                        background: autoCode === val ? 'var(--accent)' : 'transparent',
                        color: autoCode === val ? '#fff' : 'var(--text-secondary)',
                      }}
                    >{label}</button>
                  ))}
                </div>
              )}
            </div>
            <input
              className="inv-input"
              value={form.codigo}
              readOnly={autoCode}
              placeholder={autoCode ? '' : 'Ej: PROD-001'}
              onChange={e => { setAutoCode(false); f('codigo', e.target.value) }}
              style={{
                width: '100%',
                background: autoCode ? 'var(--accent-soft)' : undefined,
                color: autoCode ? 'var(--accent)' : undefined,
                fontWeight: autoCode ? 700 : undefined,
                fontFamily: 'monospace',
                cursor: autoCode ? 'default' : undefined,
              }}
            />
          </div>

          {/* ── Unidad ── */}
          <label>Unidad / Tipo *
            <select value={form.unidad} onChange={e => handleUnidad(e.target.value)}>
              <optgroup label="── Productos físicos ──">
                {UNIDADES_PRODUCTO.map(u => <option key={u}>{u}</option>)}
              </optgroup>
              <optgroup label="── Servicios ──">
                {UNIDADES_SERVICIO.map(u => <option key={u}>{u}</option>)}
              </optgroup>
            </select>
          </label>

          <label>Nombre *
            <input required placeholder={isServ ? 'Nombre del servicio' : 'Nombre del producto'}
              value={form.nombre} onChange={e => f('nombre', e.target.value)} />
          </label>

          <label>Descripción
            <input placeholder="Descripción breve (opcional)"
              value={form.descripcion} onChange={e => f('descripcion', e.target.value)} />
          </label>

          <label>Categoría
            <select value={form.categoria} onChange={e => f('categoria', e.target.value)}>
              {(isServ ? CATEGORIAS_SERV : CATEGORIAS_PROD).map(c => <option key={c}>{c}</option>)}
            </select>
          </label>

          <div className="inv-field-row">
            {!isServ && (
              <label>Precio costo (COP)
                <PrecioInput placeholder="0" value={form.precio_costo} onChange={e => f('precio_costo', e.target.value)} />
              </label>
            )}
            <label>Precio venta (COP) *
              <PrecioInput placeholder="0" value={form.precio} onChange={e => f('precio', e.target.value)} />
            </label>
          </div>

          <label>IVA %
            <select value={form.iva_porcentaje} onChange={e => f('iva_porcentaje', e.target.value)}>
              {['0','5','19'].map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </label>

          {/* Stock solo para productos físicos */}
          {!isServ && (
            <div className="inv-field-row">
              {!form.id && (
                <label>Stock inicial
                  <input type="number" min="0" step="0.001" placeholder="0"
                    value={form.stock_actual} onChange={e => f('stock_actual', e.target.value)} />
                </label>
              )}
              <label>Stock mínimo
                <input type="number" min="0" step="0.001" placeholder="0"
                  value={form.stock_minimo} onChange={e => f('stock_minimo', e.target.value)} />
              </label>
            </div>
          )}

          {isServ && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0,
              padding: '6px 10px', background: 'var(--accent-soft)', borderRadius: 6 }}>
              ℹ️ Los servicios no requieren control de stock.
            </p>
          )}

          <div className="inv-modal-foot">
            <button type="button" className="inv-btn-sec" onClick={onClose}>Cancelar</button>
            <button type="submit" className="inv-btn-pri" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal movimiento de stock (solo productos físicos) ────────────────────────
const EMPTY_MOV = { tipo: 'ENTRADA', cantidad: '', precio_unitario: '', motivo: '', referencia: '' }

function ModalMovimiento({ prod, tipoInicial, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_MOV, tipo: tipoInicial || 'ENTRADA' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await inventarioApi.movimiento(prod.id, form)
      onSave()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al registrar movimiento')
    } finally { setSaving(false) }
  }

  const tipoLabels = {
    ENTRADA: 'Entrada (compra / producción)',
    SALIDA : 'Salida (consumo / baja)',
    AJUSTE : 'Ajuste de inventario',
  }

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal inv-modal--sm" onClick={e => e.stopPropagation()}>
        <div className="inv-modal-head">
          <div>
            <h3>Movimiento de stock</h3>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              {prod.nombre} — Stock actual: <strong>{prod.stock_actual} {prod.unidad}</strong>
            </p>
          </div>
          <button className="inv-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="inv-form">
          <label>Tipo de movimiento
            <select value={form.tipo} onChange={e => f('tipo', e.target.value)}>
              {Object.entries(tipoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="inv-field-row">
            <label>Cantidad *
              <input required type="number" min="0.001" step="0.001" placeholder="0"
                value={form.cantidad} onChange={e => f('cantidad', e.target.value)} />
            </label>
            {form.tipo === 'ENTRADA' && (
              <label>Precio unitario (COP)
                <PrecioInput placeholder="0" value={form.precio_unitario} onChange={e => f('precio_unitario', e.target.value)} />
              </label>
            )}
          </div>
          <label>Motivo
            <input placeholder="Compra a proveedor, ajuste físico…"
              value={form.motivo} onChange={e => f('motivo', e.target.value)} />
          </label>
          <label>Referencia
            <input placeholder="N° factura, orden, etc."
              value={form.referencia} onChange={e => f('referencia', e.target.value)} />
          </label>
          {form.tipo === 'AJUSTE' && (
            <div className="inv-ajuste-info">
              ⚠️ El ajuste establece el stock al valor exacto indicado (no suma ni resta).
            </div>
          )}
          <div className="inv-modal-foot">
            <button type="button" className="inv-btn-sec" onClick={onClose}>Cancelar</button>
            <button type="submit" className="inv-btn-pri" disabled={saving}>
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Inventario() {
  const [productos,  setProductos]  = useState([])
  const [resumen,    setResumen]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [modalProd,  setModalProd]  = useState(null)
  const [modalMov,   setModalMov]   = useState(null)
  const [filtroQ,    setFiltroQ]    = useState('')
  const [bajosStock, setBajosStock] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [rProd, rRes] = await Promise.all([
        inventarioApi.listar({ q: filtroQ || undefined, bajo_stock: bajosStock ? 'true' : undefined }),
        inventarioApi.resumen(),
      ])
      setProductos(rProd.data.productos || [])
      setResumen(rRes.data)
    } catch (err) {
      setError(`Error al cargar: ${err.response?.data?.error || err.message}`)
    } finally { setLoading(false) }
  }, [filtroQ, bajosStock])

  useEffect(() => { cargar() }, [cargar])

  async function desactivar(p) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    await inventarioApi.desactivar(p.id)
    cargar()
  }

  const margen = (p) => {
    if (!p.precio_costo || p.precio_costo <= 0) return null
    return Math.round(((p.precio - p.precio_costo) / p.precio) * 100)
  }

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <h2 className="inv-titulo">Productos y Servicios</h2>
          <p className="inv-sub muted">Catálogo de ítems — stock en tiempo real para productos físicos</p>
        </div>
        <button className="inv-btn-pri" onClick={() => setModalProd('nuevo')}>+ Nuevo ítem</button>
      </div>

      {error && <div className="inv-error">⚠️ {error}</div>}

      {resumen && (
        <div className="inv-kpis">
          <div className="inv-kpi">
            <p className="inv-kpi-label">Total ítems</p>
            <p className="inv-kpi-val">{resumen.total_productos}</p>
          </div>
          <div className={`inv-kpi ${resumen.bajo_stock > 0 ? 'inv-kpi--warn' : ''}`}>
            {resumen.bajo_stock > 0 && <span className="inv-kpi-icon">!</span>}
            <p className="inv-kpi-label">Bajo stock</p>
            <p className="inv-kpi-val">{resumen.bajo_stock}</p>
          </div>
          <div className={`inv-kpi ${resumen.sin_stock > 0 ? 'inv-kpi--danger' : ''}`}>
            <p className="inv-kpi-label">Sin stock</p>
            <p className="inv-kpi-val">{resumen.sin_stock}</p>
          </div>
          <div className="inv-kpi">
            <p className="inv-kpi-label">Valor al costo</p>
            <p className="inv-kpi-val" style={{ fontSize: 18 }}>{COP(resumen.valor_costo)}</p>
          </div>
          <div className="inv-kpi inv-kpi--dark">
            <p className="inv-kpi-label">Valor a precio venta</p>
            <p className="inv-kpi-val">{COP(resumen.valor_venta)}</p>
          </div>
        </div>
      )}

      <div className="inv-filtros">
        <div className="inv-search-wrap">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input className="inv-search" type="search" placeholder="Buscar por nombre, código…"
            value={filtroQ} onChange={e => setFiltroQ(e.target.value)} />
        </div>
        <label className="inv-check-label">
          <input type="checkbox" checked={bajosStock} onChange={e => setBajosStock(e.target.checked)} />
          Solo bajo stock
        </label>
      </div>

      {loading ? (
        <div className="inv-loading"><div className="spinner" /></div>
      ) : productos.length === 0 ? (
        <div className="inv-empty">
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
            <path d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m16 0L12 11M4 7l8 4" />
          </svg>
          <p>{bajosStock ? 'No hay ítems con bajo stock.' : 'No hay productos ni servicios aún.'}</p>
          {!bajosStock && (
            <button className="inv-btn-pri" onClick={() => setModalProd('nuevo')}>Agregar primer ítem</button>
          )}
        </div>
      ) : (
        <div className="card table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th style={{ textAlign: 'right' }}>Stock</th>
                <th style={{ textAlign: 'right' }}>P. Venta</th>
                <th style={{ textAlign: 'right' }}>Margen</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => {
                const serv = esServicio(p.unidad)
                const mg   = margen(p)

                // Barra de stock
                const pct = !serv && p.stock_minimo > 0
                  ? Math.min(100, Math.round((p.stock_actual / (p.stock_minimo * 2)) * 100))
                  : 100
                const barColor = p.stock_actual <= 0 ? 'var(--danger)'
                  : p.stock_actual <= p.stock_minimo ? 'var(--warning)'
                  : '#10b981'

                // Estado
                const statusClass = serv ? 'inv-status-serv'
                  : p.stock_actual <= 0 ? 'inv-status-sin'
                  : p.stock_actual <= p.stock_minimo ? 'inv-status-bajo'
                  : 'inv-status-ok'
                const statusLabel = serv ? 'Servicio'
                  : p.stock_actual <= 0 ? 'Sin stock'
                  : p.stock_actual <= p.stock_minimo ? 'Bajo'
                  : 'OK'

                return (
                  <tr key={p.id}>
                    <td>
                      <code style={{ fontSize: 11, fontFamily: 'monospace',
                        background: 'var(--accent-soft)', color: 'var(--accent)',
                        padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>
                        {p.codigo || '—'}
                      </code>
                    </td>
                    <td>
                      <p className="td-main">{p.nombre}</p>
                      {p.descripcion && <p className="td-sub muted t-xs">{p.descripcion}</p>}
                    </td>
                    <td><span className="inv-cat-pill">{p.categoria}</span></td>
                    <td className="muted t-xs">{p.unidad}</td>
                    <td style={{ textAlign: 'right' }}>
                      {serv ? (
                        <span className="muted t-xs">—</span>
                      ) : (
                        <div className="inv-stock-wrap">
                          <span className="inv-stock-num">
                            {p.stock_actual} <span className="muted" style={{ fontSize: 11 }}>{p.unidad}</span>
                          </span>
                          <div className="inv-stock-bar-track">
                            <div className="inv-stock-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                          {p.stock_minimo > 0 && (
                            <span className="inv-stock-min">mín {p.stock_minimo}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }} className="td-price">{COP(p.precio)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {!serv && mg !== null
                        ? <span style={{ fontSize: 12, fontWeight: 700,
                            color: mg >= 30 ? '#059669' : mg >= 10 ? 'var(--warning)' : 'var(--danger)' }}>
                            {mg}%
                          </span>
                        : <span className="muted t-xs">—</span>
                      }
                    </td>
                    <td><span className={`inv-status-dot ${statusClass}`}>{statusLabel}</span></td>
                    <td>
                      <div className="inv-actions">
                        {!serv && (
                          <>
                            <button className="inv-action-btn inv-action-btn--entrada" title="Entrada"
                              onClick={() => setModalMov({ prod: p, tipo: 'ENTRADA' })}>+</button>
                            <button className="inv-action-btn inv-action-btn--salida" title="Salida"
                              onClick={() => setModalMov({ prod: p, tipo: 'SALIDA' })}>−</button>
                          </>
                        )}
                        <button className="inv-action-btn inv-action-btn--edit" title="Editar"
                          onClick={() => setModalProd(p)}>
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="inv-action-btn inv-action-btn--del" title="Eliminar"
                          onClick={() => desactivar(p)}>
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalProd && (
        <ModalProducto
          prod={modalProd === 'nuevo' ? null : modalProd}
          allProductos={productos}
          onSave={() => { setModalProd(null); cargar() }}
          onClose={() => setModalProd(null)}
        />
      )}

      {modalMov && (
        <ModalMovimiento
          prod={modalMov.prod}
          tipoInicial={modalMov.tipo}
          onSave={() => { setModalMov(null); cargar() }}
          onClose={() => setModalMov(null)}
        />
      )}
    </div>
  )
}
