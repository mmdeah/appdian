import { useState, useEffect } from 'react'
import { productsApi } from '../api/client'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import './Products.css'

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const EMPTY = { codigo: '', nombre: '', descripcion: '', precio: '', iva_porcentaje: 19, unidad: 'UND' }

function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState(product || EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

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
          <h3 className="modal-title">{product?.id ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-form">
          <div className="form-row">
            <Input label="Código *" value={form.codigo} onChange={set('codigo')} required placeholder="PROD-001" />
            <Input label="Unidad" value={form.unidad} onChange={set('unidad')} placeholder="UND" />
          </div>
          <Input label="Nombre *" value={form.nombre} onChange={set('nombre')} required placeholder="Nombre del producto" />
          <Input label="Descripción" value={form.descripcion} onChange={set('descripcion')} placeholder="Opcional" />
          <div className="form-row">
            <Input label="Precio (COP) *" type="number" value={form.precio} onChange={set('precio')} required min="0" step="1" />
            <Input label="IVA %" type="number" value={form.iva_porcentaje} onChange={set('iva_porcentaje')} min="0" max="100" step="0.5" />
          </div>

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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | product obj

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

  const filtered = products

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
        ) : filtered.length === 0 ? (
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
                <th>Precio</th>
                <th>IVA</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td><code className="code-chip">{p.codigo}</code></td>
                  <td>
                    <p className="td-main">{p.nombre}</p>
                    {p.descripcion && <p className="td-sub muted t-xs">{p.descripcion}</p>}
                  </td>
                  <td className="muted t-sm">{p.unidad}</td>
                  <td className="td-price">{COP(p.precio)}</td>
                  <td className="muted t-sm">{p.iva_porcentaje}%</td>
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
          onSave={() => { load(search); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
