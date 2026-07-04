import { useState, useEffect, useCallback } from 'react'
import { inventarioApi } from '../api/client'
import './Inventario.css'

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const CATEGORIAS_INV = ['GENERAL','MATERIA_PRIMA','PRODUCTO_TERMINADO','HERRAMIENTAS','PAPELERÍA','TECNOLOGÍA','REPUESTOS','OTROS']
const UNIDADES       = ['UND','KG','GR','L','ML','M','CM','CAJA','PAQUETE','ROLLO','PAR','DOCENA','OTRO']

const EMPTY_PROD = {
  codigo: '', nombre: '', descripcion: '', categoria: 'GENERAL', unidad: 'UND',
  precio_costo: '', precio_venta: '', stock_actual: '0', stock_minimo: '0',
}
const EMPTY_MOV = { tipo: 'ENTRADA', cantidad: '', precio_unitario: '', motivo: '', referencia: '' }

function StockBadge({ actual, minimo }) {
  if (actual <= 0)        return <span className="inv-badge inv-badge--sin">Sin stock</span>
  if (actual <= minimo)   return <span className="inv-badge inv-badge--bajo">Bajo</span>
  return <span className="inv-badge inv-badge--ok">OK</span>
}

function ModalProducto({ prod, onSave, onClose }) {
  const [form, setForm]     = useState(prod || EMPTY_PROD)
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (form.id) await inventarioApi.actualizar(form.id, form)
      else         await inventarioApi.crear(form)
      onSave()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal" onClick={e => e.stopPropagation()}>
        <div className="inv-modal-head">
          <h3>{form.id ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button className="inv-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="inv-form">
          <div className="inv-field-row">
            <label>Código
              <input placeholder="SKU001" value={form.codigo} onChange={e => f('codigo', e.target.value)} />
            </label>
            <label>Unidad
              <select value={form.unidad} onChange={e => f('unidad', e.target.value)}>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </label>
          </div>

          <label>Nombre *
            <input required placeholder="Nombre del producto" value={form.nombre} onChange={e => f('nombre', e.target.value)} />
          </label>

          <label>Descripción
            <input placeholder="Descripción breve" value={form.descripcion} onChange={e => f('descripcion', e.target.value)} />
          </label>

          <label>Categoría
            <select value={form.categoria} onChange={e => f('categoria', e.target.value)}>
              {CATEGORIAS_INV.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>

          <div className="inv-field-row">
            <label>Precio costo (COP)
              <input type="number" min="0" step="1" placeholder="0" value={form.precio_costo} onChange={e => f('precio_costo', e.target.value)} />
            </label>
            <label>Precio venta (COP)
              <input type="number" min="0" step="1" placeholder="0" value={form.precio_venta} onChange={e => f('precio_venta', e.target.value)} />
            </label>
          </div>

          <div className="inv-field-row">
            {!form.id && (
              <label>Stock inicial
                <input type="number" min="0" step="0.001" placeholder="0" value={form.stock_actual} onChange={e => f('stock_actual', e.target.value)} />
              </label>
            )}
            <label>Stock mínimo
              <input type="number" min="0" step="0.001" placeholder="0" value={form.stock_minimo} onChange={e => f('stock_minimo', e.target.value)} />
            </label>
          </div>

          <div className="inv-modal-foot">
            <button type="button" className="inv-btn-sec" onClick={onClose}>Cancelar</button>
            <button type="submit" className="inv-btn-pri" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalMovimiento({ prod, tipoInicial, onSave, onClose }) {
  const [form, setForm]     = useState({ ...EMPTY_MOV, tipo: tipoInicial || 'ENTRADA' })
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

  const tipoLabels = { ENTRADA: 'Entrada (compra/producción)', SALIDA: 'Salida (venta/consumo)', AJUSTE: 'Ajuste de inventario' }

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal inv-modal--sm" onClick={e => e.stopPropagation()}>
        <div className="inv-modal-head">
          <div>
            <h3>Movimiento de stock</h3>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>{prod.nombre} — Stock actual: <strong>{prod.stock_actual} {prod.unidad}</strong></p>
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
              <input required type="number" min="0.001" step="0.001" placeholder="0" value={form.cantidad} onChange={e => f('cantidad', e.target.value)} />
            </label>
            {form.tipo === 'ENTRADA' && (
              <label>Precio unitario (COP)
                <input type="number" min="0" step="1" placeholder="0" value={form.precio_unitario} onChange={e => f('precio_unitario', e.target.value)} />
              </label>
            )}
          </div>

          <label>Motivo
            <input placeholder="Ej: Compra a proveedor, venta, ajuste físico..." value={form.motivo} onChange={e => f('motivo', e.target.value)} />
          </label>
          <label>Referencia
            <input placeholder="N° factura, orden, etc." value={form.referencia} onChange={e => f('referencia', e.target.value)} />
          </label>

          {form.tipo === 'AJUSTE' && (
            <div className="inv-ajuste-info">
              ⚠️ El ajuste establece el stock al valor indicado (no suma ni resta).
            </div>
          )}

          <div className="inv-modal-foot">
            <button type="button" className="inv-btn-sec" onClick={onClose}>Cancelar</button>
            <button type="submit" className="inv-btn-pri" disabled={saving}>{saving ? 'Guardando…' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Inventario() {
  const [productos,  setProductos]  = useState([])
  const [resumen,    setResumen]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [modalProd,  setModalProd]  = useState(null)   // null | 'nuevo' | {producto}
  const [modalMov,   setModalMov]   = useState(null)   // null | { prod, tipo }
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
      const msg = err.response?.data?.error || err.message || ''
      setError(msg.includes('does not exist')
        ? 'La tabla inventario no existe aún. Ejecuta la migración SQL en Supabase.'
        : `Error al cargar: ${msg}`)
    } finally { setLoading(false) }
  }, [filtroQ, bajosStock])

  useEffect(() => { cargar() }, [cargar])

  async function desactivar(p) {
    if (!confirm(`¿Eliminar "${p.nombre}" del inventario?`)) return
    await inventarioApi.desactivar(p.id)
    cargar()
  }

  return (
    <div className="inv-page">
      {/* Header */}
      <div className="inv-header">
        <div>
          <h2 className="inv-titulo">Inventario</h2>
          <p className="inv-sub muted">Control de productos y stock en tiempo real</p>
        </div>
        <button className="inv-btn-pri" onClick={() => setModalProd('nuevo')}>+ Nuevo producto</button>
      </div>

      {error && <div className="inv-error">⚠️ {error}</div>}

      {/* KPIs */}
      {resumen && (
        <div className="inv-kpis">
          <div className="inv-kpi">
            <p className="inv-kpi-label">Total productos</p>
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

      {/* Filtros */}
      <div className="inv-filtros">
        <input
          className="inv-search"
          type="search"
          placeholder="Buscar producto…"
          value={filtroQ}
          onChange={e => setFiltroQ(e.target.value)}
        />
        <label className="inv-check-label">
          <input type="checkbox" checked={bajosStock} onChange={e => setBajosStock(e.target.checked)} />
          Solo bajo stock
        </label>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="inv-loading"><div className="spinner" /></div>
      ) : productos.length === 0 ? (
        <div className="inv-empty">
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
            <path d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m16 0L12 11M4 7l8 4" />
          </svg>
          <p>{bajosStock ? 'No hay productos con bajo stock.' : 'No hay productos en inventario.'}</p>
          {!bajosStock && (
            <button className="inv-btn-pri" onClick={() => setModalProd('nuevo')}>Agregar primer producto</button>
          )}
        </div>
      ) : (
        <div className="card table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th style={{ textAlign: 'right' }}>Stock</th>
                <th style={{ textAlign: 'right' }}>P. Venta</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id}>
                  <td className="muted t-xs">{p.codigo || '—'}</td>
                  <td>
                    <p className="td-main">{p.nombre}</p>
                    {p.descripcion && <p className="td-sub muted t-xs">{p.descripcion}</p>}
                  </td>
                  <td className="muted t-xs">{p.categoria}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="inv-stock-num">{p.stock_actual} <span className="muted" style={{ fontSize: 11 }}>{p.unidad}</span></span>
                    {p.stock_minimo > 0 && (
                      <p className="muted t-xs" style={{ textAlign: 'right' }}>mín: {p.stock_minimo}</p>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }} className="td-price">{COP(p.precio_venta)}</td>
                  <td><StockBadge actual={p.stock_actual} minimo={p.stock_minimo} /></td>
                  <td>
                    <div className="inv-actions">
                      <button className="inv-action-btn inv-action-btn--entrada" title="Entrada" onClick={() => setModalMov({ prod: p, tipo: 'ENTRADA' })}>＋</button>
                      <button className="inv-action-btn inv-action-btn--salida"  title="Salida"  onClick={() => setModalMov({ prod: p, tipo: 'SALIDA' })}>－</button>
                      <button className="inv-action-btn" title="Editar"  onClick={() => setModalProd(p)}>✏️</button>
                      <button className="inv-action-btn inv-action-btn--del" title="Eliminar" onClick={() => desactivar(p)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalProd && (
        <ModalProducto
          prod={modalProd === 'nuevo' ? null : modalProd}
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
