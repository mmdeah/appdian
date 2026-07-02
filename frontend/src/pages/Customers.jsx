import { useState, useEffect } from 'react'
import { customersApi } from '../api/client'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import './Customers.css'

const EMPTY = {
  nombre: '', nit: '', email: '', telefono: '', direccion: '',
  ciudad_id: 836, tipo_doc_id: 3, tipo_organizacion_id: 2, regimen_fiscal_id: 2,
}

function CustomerModal({ customer, onSave, onClose }) {
  const [form, setForm] = useState(customer || EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (customer?.id) {
        await customersApi.update(customer.id, form)
      } else {
        await customersApi.create(form)
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
          <h3 className="modal-title">{customer?.id ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-form">
          <Input label="Nombre / Razón Social *" value={form.nombre} onChange={set('nombre')} required placeholder="Empresa S.A.S." />
          <div className="form-row">
            <Input label="NIT / Documento *" value={form.nit} onChange={set('nit')} required placeholder="900123456-1" />
            <Input label="Teléfono" value={form.telefono} onChange={set('telefono')} placeholder="3001234567" />
          </div>
          <Input label="Correo electrónico" type="email" value={form.email} onChange={set('email')} placeholder="cliente@email.com" />
          <Input label="Dirección" value={form.direccion} onChange={set('direccion')} placeholder="Calle 123 # 45-67" />

          <div className="form-row">
            <div className="field">
              <label className="field-label">Tipo de organización</label>
              <select className="field-input" value={form.tipo_organizacion_id} onChange={set('tipo_organizacion_id')}>
                <option value={1}>Persona Natural</option>
                <option value={2}>Persona Jurídica</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Régimen fiscal</label>
              <select className="field-input" value={form.regimen_fiscal_id} onChange={set('regimen_fiscal_id')}>
                <option value={2}>No Responsable de IVA</option>
                <option value={1}>Responsable de IVA</option>
              </select>
            </div>
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

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  function load(q) {
    setLoading(true)
    customersApi.list(q)
      .then(({ data }) => setCustomers(data.clientes || []))
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
    if (!confirm('¿Eliminar este cliente?')) return
    await customersApi.remove(id)
    load(search)
  }

  const initials = (nombre) =>
    nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <div className="customers-page">
      <div className="page-toolbar">
        <div className="search-wrap" style={{ width: 280 }}>
          <svg className="search-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input className="search-input" placeholder="Buscar cliente o NIT..." value={search} onChange={handleSearch} />
        </div>
        <Button
          variant="primary"
          onClick={() => setModal('new')}
          icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>}
        >
          Nuevo cliente
        </Button>
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <p>Sin clientes registrados</p>
            <Button variant="primary" size="sm" onClick={() => setModal('new')}>Agregar primero</Button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>NIT</th>
                <th>Contacto</th>
                <th>Organización</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="customer-cell">
                      <div className="customer-avatar">{initials(c.nombre)}</div>
                      <div>
                        <p className="td-main">{c.nombre}</p>
                        {c.direccion && <p className="td-sub muted t-xs">{c.direccion}</p>}
                      </div>
                    </div>
                  </td>
                  <td><code className="code-chip">{c.nit}</code></td>
                  <td>
                    {c.email && <p className="t-sm">{c.email}</p>}
                    {c.telefono && <p className="muted t-xs">{c.telefono}</p>}
                  </td>
                  <td className="muted t-sm">
                    {c.tipo_organizacion_id === 1 ? 'Natural' : 'Jurídica'}
                  </td>
                  <td>
                    <div className="action-btns">
                      <Button variant="ghost" size="sm" onClick={() => setModal(c)}>Editar</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(c.id)}>Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <CustomerModal
          customer={modal === 'new' ? null : modal}
          onSave={() => { load(search); setModal(null) }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
