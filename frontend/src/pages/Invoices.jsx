import { useState, useEffect } from 'react'
import { invoicesApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { printFactura } from '../utils/printFactura'
import './Invoices.css'

// ── Por Cobrar tab ───────────────────────────────────────────
function PorCobrarTab() {
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading]   = useState(true)
  const [marking, setMarking]   = useState(null)

  function cargar() {
    setLoading(true)
    invoicesApi.porCobrar()
      .then(({ data }) => setFacturas(data.facturas || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  async function marcarPagada(id) {
    setMarking(id)
    try {
      await invoicesApi.marcarPagada(id)
      cargar()
    } catch { alert('Error al marcar como pagada') }
    finally { setMarking(null) }
  }

  const total = facturas.reduce((s, f) => s + (f.total || 0), 0)

  if (loading) return <div className="table-loading"><div className="spinner" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      {facturas.length > 0 && (
        <div className="inv-summary">
          <div className="inv-summary-card">
            <span className="inv-summary-label">Facturas pendientes</span>
            <span className="inv-summary-value">{facturas.length}</span>
          </div>
          <div className="inv-summary-card" style={{ gridColumn: 'span 3' }}>
            <span className="inv-summary-label">Total por cobrar</span>
            <span className="inv-summary-value" style={{ color: 'var(--danger)' }}>
              {new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(total)}
            </span>
          </div>
        </div>
      )}

      <div className="card table-card">
        {facturas.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>¡Sin facturas pendientes de cobro!</p>
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
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map(f => (
                <tr key={f.id}>
                  <td><span className="inv-num">#{f.numero_documento}</span></td>
                  <td>
                    <p className="td-main">{f.cliente_nombre || '— Consumidor Final'}</p>
                    {f.cliente_nit && <p className="td-sub muted t-xs">NIT {f.cliente_nit}</p>}
                  </td>
                  <td className="td-price td-right">
                    {new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(f.total)}
                  </td>
                  <td><Badge variant={f.estado}>{f.estado}</Badge></td>
                  <td className="muted t-xs">{new Date(f.created_at).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}</td>
                  <td>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={marking === f.id}
                      onClick={() => marcarPagada(f.id)}
                    >
                      {marking === f.id ? '…' : '✓ Cobrada'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const DATE = (s) =>
  new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

function exportarExcel(invoices) {
  const headers = ['N°', 'Tipo', 'Cliente', 'NIT', 'Subtotal', 'IVA', 'Total', 'Estado', 'Fecha']
  const rows = invoices.map(f => [
    f.numero_documento || '',
    f.tipo,
    f.cliente_nombre || 'Consumidor Final',
    f.cliente_nit || '',
    f.subtotal || 0,
    f.iva || 0,
    f.total || 0,
    f.estado,
    DATE(f.created_at),
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `facturas-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Invoices() {
  const { empresa } = useAuth()
  const [tab,      setTab]      = useState('todas')
  const [invoices, setInvoices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filters,  setFilters]  = useState({ tipo: '', estado: '', desde: '', hasta: '' })
  const [expanded, setExpanded] = useState(null)
  const [printing, setPrinting] = useState(null)

  async function handlePrint(facturaId) {
    setPrinting(facturaId)
    try {
      const { data } = await invoicesApi.get(facturaId)
      printFactura(data, empresa || {})
    } catch {
      alert('No se pudo cargar el detalle de la factura.')
    } finally {
      setPrinting(null)
    }
  }

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

  function limpiar() {
    const empty = { tipo: '', estado: '', desde: '', hasta: '' }
    setFilters(empty)
    load(empty)
  }

  // Totales calculados del listado actual
  const totalFacturado = invoices.reduce((s, f) => s + (f.total    || 0), 0)
  const totalIVA       = invoices.reduce((s, f) => s + (f.iva      || 0), 0)
  const totalSinIVA    = invoices.reduce((s, f) => s + (f.subtotal || 0), 0)

  return (
    <div className="invoices-page">

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="inv-tabs">
        <button className={`inv-tab ${tab === 'todas' ? 'inv-tab--active' : ''}`} onClick={() => setTab('todas')}>
          📋 Todas las facturas
        </button>
        <button className={`inv-tab ${tab === 'cobrar' ? 'inv-tab--active' : ''}`} onClick={() => setTab('cobrar')}>
          💰 Por cobrar
        </button>
      </div>

      {tab === 'cobrar' && <PorCobrarTab />}

      {tab === 'todas' && <>
      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
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
            <option value="APROBADA">Aprobada (DIAN)</option>
            <option value="EMITIDA_LOCAL">Emitida local</option>
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
        <Button variant="ghost" size="sm" onClick={limpiar}>Limpiar</Button>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            variant="secondary" size="sm"
            onClick={() => exportarExcel(invoices)}
            disabled={invoices.length === 0}
          >
            ↓ Exportar Excel
          </Button>
        </div>
      </div>

      {/* ── Tarjetas resumen ────────────────────────────────────────────────── */}
      {!loading && invoices.length > 0 && (
        <div className="inv-summary">
          <div className="inv-summary-card">
            <span className="inv-summary-label">Facturas</span>
            <span className="inv-summary-value">{invoices.length}</span>
          </div>
          <div className="inv-summary-card">
            <span className="inv-summary-label">Total facturado</span>
            <span className="inv-summary-value">{COP(totalFacturado)}</span>
          </div>
          <div className="inv-summary-card">
            <span className="inv-summary-label">Subtotal sin IVA</span>
            <span className="inv-summary-value">{COP(totalSinIVA)}</span>
          </div>
          <div className="inv-summary-card inv-summary-iva">
            <span className="inv-summary-label">IVA total</span>
            <span className="inv-summary-value">{COP(totalIVA)}</span>
          </div>
        </div>
      )}

      {/* ── Tabla ───────────────────────────────────────────────────────────── */}
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
                <th className="td-right">Subtotal</th>
                <th className="td-right">IVA</th>
                <th className="td-right">Total</th>
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
                    <td className="td-right muted t-sm">{COP(f.subtotal)}</td>
                    <td className="td-right muted t-sm">{COP(f.iva)}</td>
                    <td className="td-price td-right">{COP(f.total)}</td>
                    <td><Badge variant={f.estado}>{f.estado}</Badge></td>
                    <td className="muted t-xs">{DATE(f.created_at)}</td>
                    <td>
                      <div className="action-btns">
                        <Button variant="ghost" size="sm" onClick={() => setExpanded(prev => prev === f.id ? null : f.id)}>
                          {expanded === f.id ? 'Cerrar' : 'Ver'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={printing === f.id}
                          onClick={() => handlePrint(f.id)}
                          title="Imprimir / Guardar como PDF"
                        >
                          {printing === f.id ? '…' : '🖨️ PDF'}
                        </Button>
                        {f.pdf_url && (
                          <a href={f.pdf_url} target="_blank" rel="noreferrer">
                            <Button variant="secondary" size="sm">DIAN</Button>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === f.id && (
                    <tr key={`${f.id}-detail`} className="detail-row">
                      <td colSpan={9}>
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
      </>}
    </div>
  )
}
