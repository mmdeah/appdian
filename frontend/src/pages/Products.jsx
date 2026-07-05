import { useState, useEffect } from 'react'
import { productsApi } from '../api/client'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import './Products.css'

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

// Unidades de servicio (sin stock físico)
const UNIDADES_SERVICIO  = ['SRV','HORA','HR','MIN','CONS','MES','DIA']
const UNIDADES_PRODUCTO  = ['UND','KG','GR','L','ML','M','CM','CAJA','PAQUETE','ROLLO','PAR','DOCENA']
const CATEGORIAS_PROD    = ['GENERAL','MATERIA_PRIMA','PRODUCTO_TERMINADO','HERRAMIENTAS','PAPELERÍA','TECNOLOGÍA','REPUESTOS','OTROS']
const CATEGORIAS_SERV    = ['SERVICIO','CONSULTORÍA','ASESORÍA','FORMACIÓN','TRÁMITES','OTROS']

const esServicio = u => UNIDADES_SERVICIO.includes((u || '').toUpperCase())

// Genera el siguiente código progresivo según los existentes
// Ej: si ya hay PROD-001, PROD-003 → genera PROD-004
function generarCodigo(allProducts, unidad) {
  const prefix = esServicio(unidad) ? 'SRV' : 'PROD'
  const nums = (allProducts || [])
    .map(p => p.codigo || '')
    .filter(c => c.startsWith(prefix + '-'))
    .map(c => parseInt(c.slice(prefix.length + 1)) || 0)
    .filter(n => n > 0)
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}

const EMPTY = {
  codigo: '', nombre: '', descripcion: '',
  precio: '', iva_porcentaje: 19, unidad: 'UND',
  precio_costo: '0', stock_actual: '0', stock_minimo: '0',
  categoria: 'GENERAL',
}

function ProductModal({ product, allProducts, onSave, onClose }) {
  const isNew = !product?.id
  const [autoCode, setAutoCode] = useState(isNew)
  const [form, setForm] = useState(() =>
    isNew
      ? { ...EMPTY, codigo: generarCodigo(allProducts, EMPTY.unidad) }
      : product
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const isServ = esServicio(form.unidad)

  // Cuando cambia la unidad, ajustar categoría y regenerar código si está en auto
  function handleUnidad(u) {
    const serv = esServicio(u)
    setForm(prev => ({
      ...prev,
      unidad   : u,
      codigo   : autoCode ? generarCodigo(allProducts, u) : prev.codigo,
      categoria: serv
        ? (CATEGORIAS_SERV.includes(prev.categoria) ? prev.categoria : 'SERVICIO')
        : (CATEGORIAS_PROD.includes(prev.categoria) ? prev.categoria : 'GENERAL'),
    }))
  }

  function activarAuto() {
    setAutoCode(true)
    setForm(prev => ({ ...prev, codigo: generarCodigo(allProducts, prev.unidad) }))
  }

  function activarManual() {
    setAutoCode(false)
    setForm(prev => ({ ...prev, codigo: '' }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (product?.id) {
        await productsApi.update(product.id, form)
      } else {
        await productsApi.create(form)
      }
      onSave()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card card fade-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{product?.id ? 'Editar producto / servicio' : 'Nuevo producto / servicio'}</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-form">
          {/* Fila 1: código + unidad */}
          <div className="form-row">
            {/* ── Campo código con toggle Auto/Manual ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="field-label">Código *</label>
                {isNew && (
                  <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 2 }}>
                    {[['✦ Auto', true], ['Manual', false]].map(([label, val]) => (
                      <button
                        key={label} type="button"
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
                className="field-input"
                required
                value={form.codigo}
                readOnly={autoCode}
                placeholder={autoCode ? '' : 'Ej: PROD-001'}
                onChange={e => { setAutoCode(false); set('codigo')(e) }}
                style={{
                  background: autoCode ? 'var(--accent-soft)' : undefined,
                  color: autoCode ? 'var(--accent)' : undefined,
                  fontWeight: autoCode ? 600 : undefined,
                  fontFamily: 'monospace',
                  cursor: autoCode ? 'default' : undefined,
                }}
              />
            </div>
            <label className="input-label" style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)' }}>Unidad *</span>
              <select
                className="input-field"
                value={form.unidad}
                onChange={e => handleUnidad(e.target.value)}
                style={{ height:38 }}
              >
                <optgroup label="── Productos físicos ──">
                  {UNIDADES_PRODUCTO.map(u => <option key={u} value={u}>{u}</option>)}
                </optgroup>
                <optgroup label="── Servicios ──">
                  {UNIDADES_SERVICIO.map(u => <option key={u} value={u}>{u}</option>)}
                </optgroup>
              </select>
            </label>
          </div>

          <Input label="Nombre *" value={form.nombre} onChange={set('nombre')} required placeholder="Nombre del producto o servicio" />
          <Input label="Descripción" value={form.descripcion} onChange={set('descripcion')} placeholder="Opcional" />

          {/* Categoría */}
          <label className="input-label" style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)' }}>Categoría</span>
            <select className="input-field" value={form.categoria} onChange={set('categoria')} style={{ height:38 }}>
              {(isServ ? CATEGORIAS_SERV : CATEGORIAS_PROD).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          {/* Precios */}
          <div className="form-row">
            <Input label="Precio venta (COP) *" price value={form.precio} onChange={set('precio')} required />
            <Input label="IVA %" type="number" value={form.iva_porcentaje} onChange={set('iva_porcentaje')} min="0" max="100" step="0.5" />
          </div>

          {/* Precio costo — siempre útil para margen */}
          <Input label="Precio costo (COP)" price value={form.precio_costo} onChange={set('precio_costo')} placeholder="0" />

          {/* Stock — solo para productos físicos */}
          {!isServ && (
            <div className="form-row">
              {!product?.id && (
                <Input label="Stock inicial" type="number" value={form.stock_actual} onChange={set('stock_actual')} min="0" step="0.001" placeholder="0" />
              )}
              <Input label="Stock mínimo" type="number" value={form.stock_minimo} onChange={set('stock_minimo')} min="0" step="0.001" placeholder="0" />
            </div>
          )}

          {isServ && (
            <p style={{ fontSize:12, color:'var(--text-muted)', margin:0, padding:'6px 10px', background:'var(--surface)', borderRadius:6 }}>
              ℹ️ Los servicios no requieren control de stock.
            </p>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search,  setSearch]    = useState('')
  const [modal,   setModal]     = useState(null)

  function load(q) {
    setLoading(true)
    productsApi.list(q)
      .then(({ data }) => setProducts(data.productos || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function handleSearch(e) {
    setSearch(e.target.value)
    const q = e.target.value
    if (q.length === 0 || q.length >= 2) load(q)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este producto?')) return
    await productsApi.remove(id)
    load(search)
  }

  return (
    <div className="products-page">
      <div className="page-toolbar">
        <div className="search-wrap" style={{ width: 280 }}>
          <svg className="search-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input className="search-input" placeholder="Buscar producto..." value={search} onChange={handleSearch} />
        </div>
        <Button
          variant="primary"
          onClick={() => setModal('new')}
          icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>}
        >
          Nuevo producto
        </Button>
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
              <path d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m16 0L12 11M4 7l8 4" />
            </svg>
            <p>Sin productos</p>
            <Button variant="primary" size="sm" onClick={() => setModal('new')}>Agregar primero</Button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Unidad</th>
                <th>Categoría</th>
                <th style={{ textAlign:'right' }}>Precio</th>
                <th>IVA</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td><code className="code-chip">{p.codigo}</code></td>
                  <td>
                    <p className="td-main">{p.nombre}</p>
                    {p.descripcion && <p className="td-sub muted t-xs">{p.descripcion}</p>}
                  </td>
                  <td className="muted t-sm">{p.unidad}</td>
                  <td className="muted t-xs">{p.categoria || '—'}</td>
                  <td className="td-price" style={{ textAlign:'right' }}>{COP(p.precio)}</td>
                  <td className="muted t-sm">{p.iva_porcentaje}%</td>
                  <td className="muted t-sm">
                    {esServicio(p.unidad)
                      ? <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>
                      : <span style={{ fontWeight: p.stock_actual <= (p.stock_minimo || 0) && p.stock_actual >= 0 ? 700 : 400,
                                       color: p.stock_actual <= 0 ? 'var(--danger)' : p.stock_actual <= p.stock_minimo ? 'var(--warning)' : 'inherit' }}>
                          {p.stock_actual}
                        </span>
                    }
                  </td>
                  <td>
                    <Badge variant={p.activo ? 'success' : 'muted'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td>
                    <div className="action-btns">
                      <Button variant="ghost" size="sm" onClick={() => setModal(p)}>Editar</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          allProducts={products}
          onSave={() => { load(search); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
