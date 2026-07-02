import { useState, useEffect } from 'react'
import { invoicesApi } from '../api/client'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import './Invoices.css'

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const DATE = (s) =>
  new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ tipo: '', estado: '', desde: '', hasta: '' })
  const [expanded, setExpanded] = useState(null)

  function load(f = filters) {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v))
    invoicesApi.list(params)
      .then(({ data }) => setInvoices(data.facturas || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const setFilter = (k) => (e) => {
    const next = { ...filters, [k]: e.target.value }
    setFilters(next)
    load(next)
  }

  function toggleExpand(id) {
    setExpanded(prev => prev === id ? null : id)
  }

  return (
    <div className="invoices-page">
      {/* Filters */}
      <div className="inv-filters card">
        <div className="filter-group">
          <label className="filter-label caps muted">Tipo</label>
          <select className="filter-select" value={filters.tipo} onChange={setFilter('tipo')}>
            <option value="">Todos</option>
            <option value="POS">POS</option>
            <option value="FE">Factura FE</option>
            <option value="NC">Nota Crédito</option>
            <option value="ND">Nota Débito</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label caps muted">Estado</label>
          <select className="filter-select" value={filters.estado} onChange={setFilter('estado')}>
            <option value="">Todos</option>
            <option value="APROBADA">Aprobada</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="RECHAZADA">Rechazada</option>
            <option value="ERROR">Error</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label caps muted">Desde</label>
          <input className="filter-date" type="date" value={filters.desde} onChange={setFilter('desde')} />
        </div>
        <div className="filter-group">
          <label className="filter-label caps muted">Hasta</label>
          <input className="filter-date" type="date" value={filters.hasta} onChange={setFilter('hasta')} />
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setFilters({ tipo: '', estado: '', desde: '', hasta: '' }); load({ tipo: '', estado: '', desde: '', hasta: '' }) }}>
          Limpiar
        </Button>
      </div>

      {/* Table */}
      <div className="card table-card">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>Sin facturas para los filtros seleccionados</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(f => (
                <>
                  <tr key={f.id} className={expanded === f.id ? 'row-expanded' : ''}>
                    <td><span className="inv-num">#{f.numero_documento}</span></td>
                    <td><Badge variant={f.tipo}>{f.tipo}</Badge></td>
                    <td>
                      <p className="td-main">{f.cliente_nombre || '— Consumidor Final'}</p>
                      {f.cliente_nit && <p className="td-sub muted t-xs">NIT {f.cliente_nit}</p>}
                    </td>
                    <td className="td-price">{COP(f.total)}</td>
                    <td><Badge variant={f.estado}>{f.estado}</Badge></td>
                    <td className="muted t-xs">{DATE(f.created_at)}</td>
                    <td>
                      <div className="action-btns">
                        <Button variant="ghost" size="sm" onClick={() => toggleExpand(f.id)}>
                          {expanded === f.id ? 'Cerrar' : 'Ver'}
                        </Button>
                        {f.pdf_url && (
                          <a href={f.pdf_url} target="_blank" rel="noreferrer">
                            <Button variant="secondary" size="sm">PDF</Button>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === f.id && (
                    <tr key={`${f.id}-detail`} className="detail-row">
                      <td colSpan={7}>
                        <div className="inv-detail">
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-key caps muted">CUFE</span>
                              <span className="detail-val t-xs">{f.cufe || '—'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-key caps muted">Cajero</span>
                              <span className="detail-val t-sm">{f.cajero || '—'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-key caps muted">Subtotal</span>
                              <span className="detail-val t-sm">{COP(f.subtotal)}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-key caps muted">IVA</span>
                              <span className="detail-val t-sm">{COP(f.iva)}</span>
                            </div>
                          </div>
                        </div>
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
