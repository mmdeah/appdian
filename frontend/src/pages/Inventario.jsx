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
            <p className="inv-kpi-label">Bajo stock</p>
            <p className="inv-kpi-val" style={{ color: resumen.bajo_stock > 0 ? 'var(--warning)' : undefined }}>
              {resumen.bajo_stock}
            </p>
          </div>
          <div className={`inv-kpi ${resumen.sin_stock > 0 ? 'inv-kpi--danger' : ''}`}>
            <p className="inv-kpi-label">Sin stock</p>
            <p className="inv-kpi-val" style={{ color: resumen.sin_stock > 0 ? 'var(--danger)' : undefined }}>
              {resumen.sin_stock}
            </p>
          </div>
          <div className="inv-kpi">
            <p className="inv-kpi-label">Valor al costo</p>
            <p className="inv-kpi-val">{COP(resumen.valor_costo)}</p>
          </div>
          <div className="inv-kpi">
            <p className="inv-kpi-label">Valor a precio venta</p>
            <p className="inv-kpi-val" style={{ color: 'var(--accent)' }}>{COP(resumen.valor_venta)}</p>
          </div>
        </div>
      )}

      <div className="inv-filtros">
        <input className="inv-search" type="search" placeholder="Buscar por nombre, código…"
          value={filtroQ} onChange={e => setFiltroQ(e.target.value)} />
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
                return (
                  <tr key={p.id}>
                    <td>
                      <code style={{ fontSize: 11, fontFamily: 'monospace',
                        background: 'var(--accent-soft)', color: 'var(--accent)',
                        padding: '2px 6px', borderRadius: 4 }}>
                        {p.codigo || '—'}
                      </code>
                    </td>
                    <td>
                      <p className="td-main">{p.nombre}</p>
                      {p.descripcion && <p className="td-sub muted t-xs">{p.descripcion}</p>}
                    </td>
                    <td className="muted t-xs">{p.categoria}</td>
                    <td className="muted t-xs">{p.unidad}</td>
                    <td style={{ textAlign: 'right' }}>
                      {serv ? (
                        <span className="muted t-xs">—</span>
                      ) : (
                        <>
                          <span className="inv-stock-num">
                            {p.stock_actual} <span className="muted" style={{ fontSize: 11 }}>{p.unidad}</span>
                          </span>
                          {p.stock_minimo > 0 && (
                            <p className="muted t-xs" style={{ textAlign: 'right' }}>mín: {p.stock_minimo}</p>
                          )}
                        </>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }} className="td-price">{COP(p.precio)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {!serv && mg !== null
                        ? <span style={{ fontSize: 12, fontWeight: 700, color: mg >= 30 ? '#059669' : mg >= 10 ? 'var(--warning)' : 'var(--danger)' }}>{mg}%</span>
                        : <span className="muted t-xs">—</span>
                      }
                    </td>
                    <td>
                      {serv
                        ? <ServicioBadge />
                        : <StockBadge actual={p.stock_actual} minimo={p.stock_minimo} />
                      }
                    </td>
                    <td>
                      <div className="inv-actions">
                        {!serv && (
                          <>
                            <button className="inv-action-btn inv-action-btn--entrada" title="Entrada" onClick={() => setModalMov({ prod: p, tipo: 'ENTRADA' })}>＋</button>
                            <button className="inv-action-btn inv-action-btn--salida"  title="Salida"  onClick={() => setModalMov({ prod: p, tipo: 'SALIDA' })}>－</button>
                          </>
                        )}
                        <button className="inv-action-btn" title="Editar"   onClick={() => setModalProd(p)}>✏️</button>
                        <button className="inv-action-btn inv-action-btn--del" title="Eliminar" onClick={() => desactivar(p)}>🗑️</button>
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
