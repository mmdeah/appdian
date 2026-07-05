import { useState, useEffect, useCallback } from 'react'
import { gastosApi } from '../api/client'
import PrecioInput from '../components/ui/PrecioInput'
import './Gastos.css'

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

function isoHoy() { return new Date().toISOString().split('T')[0] }
function isoDesde(days) {
  const d = new Date(); d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

// ── Datos de categorías ──────────────────────────────────────
const CATEGORIAS = {
  NOMINA:            { label: 'Nómina',              emoji: '👥', color: '#6366f1' },
  ARRENDAMIENTO:     { label: 'Arrendamiento',        emoji: '🏠', color: '#0ea5e9' },
  SERVICIOS_PUBLICOS:{ label: 'Servicios públicos',   emoji: '💡', color: '#f59e0b' },
  MATERIA_PRIMA:     { label: 'Materia prima',        emoji: '🏭', color: '#10b981' },
  MERCANCIA:         { label: 'Mercancía',             emoji: '📦', color: '#3b82f6' },
  SERVICIOS_PROF:    { label: 'Servicios profesionales', emoji: '💼', color: '#8b5cf6' },
  PUBLICIDAD:        { label: 'Publicidad',            emoji: '📢', color: '#f43f5e' },
  MANTENIMIENTO:     { label: 'Mantenimiento',         emoji: '🔧', color: '#64748b' },
  VIATICOS:          { label: 'Viáticos',              emoji: '✈️', color: '#06b6d4' },
  IMPUESTOS:         { label: 'Impuestos',             emoji: '🏛️', color: '#dc2626' },
  PAPELERIA:         { label: 'Papelería',             emoji: '📝', color: '#84cc16' },
  TECNOLOGIA:        { label: 'Tecnología',            emoji: '💻', color: '#a855f7' },
  FINANCIERO:        { label: 'Financiero',            emoji: '🏦', color: '#0891b2' },
  OTROS:             { label: 'Otros',                 emoji: '📌', color: '#94a3b8' },
}

const MEDIOS_PAGO = ['EFECTIVO','TRANSFERENCIA','TARJETA','CHEQUE','OTRO']
const TIPOS_COMP  = ['FACTURA','RECIBO','CUENTA_COBRO','NOMINA','CONTRATO','OTRO']

const EMPTY_GASTO = {
  categoria: 'SERVICIOS_PUBLICOS',
  subcategoria: '',
  proveedor: '',
  descripcion: '',
  monto: '',
  iva: '0',
  tipo_comprobante: 'FACTURA',
  numero_comprobante: '',
  fecha: isoHoy(),
  medio_pago: 'TRANSFERENCIA',
  pagado: true,
  notas: '',
}

// ── Modal de gasto ───────────────────────────────────────────
function ModalGasto({ gasto, onSave, onClose }) {
  const [form, setForm] = useState(gasto || EMPTY_GASTO)
  const [saving, setSaving] = useState(false)

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (form.id) await gastosApi.actualizar(form.id, form)
      else await gastosApi.crear(form)
      onSave()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const total = (parseFloat(form.monto) || 0) + (parseFloat(form.iva) || 0)

  return (
    <div className="g-modal-overlay" onClick={onClose}>
      <div className="g-modal-box" onClick={e => e.stopPropagation()}>
        <div className="g-modal-head">
          <h3>{form.id ? 'Editar gasto' : 'Registrar gasto'}</h3>
          <button className="g-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} className="g-form">
          {/* Categoría */}
          <div className="g-field-row">
            <label>Categoría *
              <select required value={form.categoria} onChange={e => f('categoria', e.target.value)}>
                {Object.entries(CATEGORIAS).map(([k, v]) => (
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                ))}
              </select>
            </label>
            <label>Subcategoría
              <input placeholder="Ej: Internet, Agua…" value={form.subcategoria} onChange={e => f('subcategoria', e.target.value)} />
            </label>
          </div>

          {/* Descripción y proveedor */}
          <label>Descripción *
            <input required placeholder="Ej: Pago factura de energía enero" value={form.descripcion} onChange={e => f('descripcion', e.target.value)} />
          </label>
          <label>Proveedor / Acreedor
            <input placeholder="EPM, Claro, Bancolombia…" value={form.proveedor} onChange={e => f('proveedor', e.target.value)} />
          </label>

          {/* Valores */}
          <div className="g-field-row">
            <label>Valor (sin IVA) *
              <PrecioInput required placeholder="0" value={form.monto} onChange={e => f('monto', e.target.value)} />
            </label>
            <label>IVA
              <PrecioInput placeholder="0" value={form.iva} onChange={e => f('iva', e.target.value)} />
            </label>
          </div>

          {total > 0 && (
            <div className="g-total-preview">
              Total: <strong>{COP(total)}</strong>
            </div>
          )}

          {/* Comprobante */}
          <div className="g-field-row">
            <label>Tipo comprobante
              <select value={form.tipo_comprobante} onChange={e => f('tipo_comprobante', e.target.value)}>
                {TIPOS_COMP.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>N° comprobante
              <input placeholder="001-2025" value={form.numero_comprobante} onChange={e => f('numero_comprobante', e.target.value)} />
            </label>
          </div>

          {/* Fecha y medio de pago */}
          <div className="g-field-row">
            <label>Fecha *
              <input required type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)} />
            </label>
            <label>Medio de pago
              <select value={form.medio_pago} onChange={e => f('medio_pago', e.target.value)}>
                {MEDIOS_PAGO.map(m => <option key={m}>{m}</option>)}
              </select>
            </label>
          </div>

          {/* Notas */}
          <label>Notas
            <textarea rows={2} placeholder="Observaciones adicionales…" value={form.notas} onChange={e => f('notas', e.target.value)} />
          </label>

          {/* Pagado */}
          <label className="g-check-label">
            <input type="checkbox" checked={form.pagado} onChange={e => f('pagado', e.target.checked)} />
            Gasto ya pagado
          </label>

          <div className="g-modal-foot">
            <button type="button" className="g-btn-sec" onClick={onClose}>Cancelar</button>
            <button type="submit" className="g-btn-pri" disabled={saving}>{saving ? 'Guardando…' : 'Guardar gasto'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Exportar a Excel ─────────────────────────────────────────
function exportarExcel(gastos) {
  const headers = ['Fecha','Descripción','Categoría','Proveedor','Monto','IVA','Total','Comprobante','Medio de pago','Pagado']
  const rows = gastos.map(g => [
    g.fecha || '',
    g.descripcion || '',
    CATEGORIAS[g.categoria]?.label || g.categoria || '',
    g.proveedor || '',
    g.monto || 0,
    g.iva || 0,
    g.total ?? ((g.monto || 0) + (g.iva || 0)),
    g.numero_comprobante ? `${g.tipo_comprobante} ${g.numero_comprobante}` : '',
    g.medio_pago || '',
    g.pagado ? 'Sí' : 'No',
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `gastos-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Chip de categoría ────────────────────────────────────────
function CatChip({ cat }) {
  const c = CATEGORIAS[cat] || CATEGORIAS.OTROS
  return (
    <span className="cat-chip" style={{ background: c.color + '18', color: c.color, border: `1px solid ${c.color}30` }}>
      {c.emoji} {c.label}
    </span>
  )
}

// ── Página principal ─────────────────────────────────────────
export default function Gastos() {
  const [tab, setTab]               = useState('lista')
  const [gastos, setGastos]         = useState([])
  const [resumen, setResumen]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [modal, setModal]           = useState(null)    // null | 'nuevo' | {gasto}
  const [filtros, setFiltros]       = useState({ desde: isoDesde(30), hasta: isoHoy(), categoria: '' })
  const [pagina, setPagina]         = useState(0)
  const [total, setTotal]           = useState(0)
  const LIMIT = 50

  const cargar = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = {
        desde:     filtros.desde,
        hasta:     filtros.hasta,
        categoria: filtros.categoria || undefined,
        limit:     LIMIT,
        offset:    pagina * LIMIT,
      }
      const [rGastos, rRes] = await Promise.all([
        gastosApi.listar(params),
        gastosApi.resumen({ desde: filtros.desde, hasta: filtros.hasta }),
      ])
      setGastos(rGastos.data.gastos || [])
      setTotal(rGastos.data.total || 0)
      setResumen(rRes.data)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error desconocido'
      setError(msg.includes('does not exist')
        ? 'La tabla de gastos no existe aún. Ejecuta gastos_migration.sql en Supabase.'
        : `Error al cargar gastos: ${msg}`)
    } finally { setLoading(false) }
  }, [filtros, pagina])

  useEffect(() => { cargar() }, [cargar])

  async function eliminar(g) {
    if (!confirm(`¿Eliminar "${g.descripcion}"?`)) return
    await gastosApi.eliminar(g.id)
    cargar()
  }

  function setFiltro(k, v) {
    setFiltros(p => ({ ...p, [k]: v }))
    setPagina(0)
  }

  return (
    <div className="gastos-page">
      {/* ── Header ── */}
      <div className="g-header">
        <div>
          <h2 className="g-titulo">Control de Gastos</h2>
          <p className="g-subtitulo muted">Registro y análisis de todos tus egresos</p>
        </div>
        <button className="g-btn-pri" onClick={() => setModal('nuevo')}>+ Registrar gasto</button>
      </div>

      {error && (
        <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'12px 16px', color:'#991b1b', fontSize:14, marginBottom:16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Resumen cards ── */}
      {resumen && (
        <div className="g-resumen-grid">
          <div className="g-kpi">
            <p className="g-kpi-label">Total gastos</p>
            <p className="g-kpi-val color-danger">{COP(resumen.total_gastos)}</p>
            <p className="g-kpi-sub muted">{resumen.num_gastos} registros</p>
          </div>
          <div className="g-kpi">
            <p className="g-kpi-label">IVA pagado</p>
            <p className="g-kpi-val">{COP(resumen.total_iva)}</p>
            <p className="g-kpi-sub muted">Deducible en declaración</p>
          </div>
          <div className="g-kpi g-kpi--top">
            <p className="g-kpi-label">Mayor categoría</p>
            <p className="g-kpi-val g-kpi-val--sm">{resumen.categorias?.[0] ? CATEGORIAS[resumen.categorias[0].nombre]?.emoji + ' ' + CATEGORIAS[resumen.categorias[0].nombre]?.label : '—'}</p>
            <p className="g-kpi-sub muted">{COP(resumen.categorias?.[0]?.total)}</p>
          </div>
          <div className="g-kpi">
            <p className="g-kpi-label">Período</p>
            <p className="g-kpi-val g-kpi-val--sm">{filtros.desde} → {filtros.hasta}</p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="g-tabs">
        <button className={`g-tab ${tab === 'lista' ? 'g-tab--active' : ''}`} onClick={() => setTab('lista')}>
          📋 Listado
        </button>
        <button className={`g-tab ${tab === 'categorias' ? 'g-tab--active' : ''}`} onClick={() => setTab('categorias')}>
          📊 Por categoría
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="g-filtros">
        <div className="gf-group">
          <label>Desde</label>
          <input type="date" value={filtros.desde} onChange={e => setFiltro('desde', e.target.value)} />
        </div>
        <div className="gf-group">
          <label>Hasta</label>
          <input type="date" value={filtros.hasta} onChange={e => setFiltro('hasta', e.target.value)} />
        </div>
        <div className="gf-group">
          <label>Categoría</label>
          <select value={filtros.categoria} onChange={e => setFiltro('categoria', e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(CATEGORIAS).map(([k, v]) => (
              <option key={k} value={k}>{v.emoji} {v.label}</option>
            ))}
          </select>
        </div>
        <button className="gf-clear" onClick={() => { setFiltros({ desde: isoDesde(30), hasta: isoHoy(), categoria: '' }); setPagina(0) }}>
          Limpiar
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <button
            className="g-btn-export"
            onClick={() => exportarExcel(gastos)}
            disabled={gastos.length === 0}
          >
            ↓ Exportar Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="g-loading"><div className="spinner" /></div>
      ) : tab === 'lista' ? (

        /* ── Listado ── */
        <>
          {gastos.length === 0 ? (
            <div className="g-empty">
              <p>No hay gastos en este período.</p>
              <button className="g-btn-pri" onClick={() => setModal('nuevo')}>Registrar primer gasto</button>
            </div>
          ) : (
            <>
              <div className="g-tabla">
                <div className="g-tabla-head">
                  <span>Fecha</span>
                  <span>Descripción</span>
                  <span>Categoría</span>
                  <span>Proveedor</span>
                  <span>Monto</span>
                  <span>IVA</span>
                  <span>Total</span>
                  <span></span>
                </div>
                {gastos.map(g => (
                  <div key={g.id} className="g-row">
                    <span className="g-fecha">{g.fecha}</span>
                    <div>
                      <p className="g-desc">{g.descripcion}</p>
                      {g.numero_comprobante && <p className="muted g-comp">{g.tipo_comprobante} {g.numero_comprobante}</p>}
                    </div>
                    <span><CatChip cat={g.categoria} /></span>
                    <span className="muted g-prov">{g.proveedor || '—'}</span>
                    <span className="g-monto">{COP(g.monto)}</span>
                    <span className="muted">{COP(g.iva)}</span>
                    <span className="g-total font-bold">{COP(g.total ?? g.monto + g.iva)}</span>
                    <div className="g-acciones">
                      <button className="g-icon-btn" onClick={() => setModal(g)} title="Editar">✏️</button>
                      <button className="g-icon-btn g-icon-btn--danger" onClick={() => eliminar(g)} title="Eliminar">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Paginación */}
              {total > LIMIT && (
                <div className="g-paginacion">
                  <button className="g-btn-pg" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>← Anterior</button>
                  <span className="muted">{pagina * LIMIT + 1}–{Math.min((pagina + 1) * LIMIT, total)} de {total}</span>
                  <button className="g-btn-pg" disabled={(pagina + 1) * LIMIT >= total} onClick={() => setPagina(p => p + 1)}>Siguiente →</button>
                </div>
              )}
            </>
          )}
        </>

      ) : (

        /* ── Por categoría ── */
        <div className="g-categorias">
          {(!resumen?.categorias || resumen.categorias.length === 0) ? (
            <div className="g-empty"><p>No hay gastos en este período.</p></div>
          ) : (
            resumen.categorias.map(cat => {
              const meta = CATEGORIAS[cat.nombre] || CATEGORIAS.OTROS
              const pct  = resumen.total_gastos > 0
                ? ((cat.total / resumen.total_gastos) * 100).toFixed(1)
                : 0
              return (
                <div key={cat.nombre} className="g-cat-row">
                  <div className="g-cat-icon" style={{ background: meta.color + '20', color: meta.color }}>
                    {meta.emoji}
                  </div>
                  <div className="g-cat-info">
                    <div className="g-cat-top">
                      <span className="g-cat-nombre">{meta.label}</span>
                      <span className="g-cat-total font-bold">{COP(cat.total)}</span>
                    </div>
                    <div className="g-cat-bar-wrap">
                      <div
                        className="g-cat-bar"
                        style={{ width: `${pct}%`, background: meta.color }}
                      />
                    </div>
                    <span className="g-cat-pct muted">{pct}% del total</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ModalGasto
          gasto={modal === 'nuevo' ? null : modal}
          onSave={() => { setModal(null); cargar() }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
