import { useState, useEffect, useCallback } from 'react'
import { cajaMenorApi } from '../api/client'
import './CajaMenor.css'

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
function isoHoy() { return new Date().toISOString().split('T')[0] }
function isoDesde(days) {
  const d = new Date(); d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

const CATEGORIAS_CM = [
  'PAPELERÍA', 'CAFETERÍA', 'TRANSPORTE', 'MENSAJERÍA', 'LIMPIEZA',
  'RECARGAS', 'PARQUEADERO', 'VARIOS',
]

const EMPTY = {
  tipo: 'EGRESO',
  fecha: isoHoy(),
  descripcion: '',
  categoria: 'VARIOS',
  monto: '',
  comprobante: '',
  responsable: '',
  notas: '',
}

function Modal({ mov, onSave, onClose }) {
  const [form, setForm]     = useState(mov || EMPTY)
  const [saving, setSaving] = useState(false)

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (form.id) await cajaMenorApi.actualizar(form.id, form)
      else         await cajaMenorApi.crear(form)
      onSave()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="cm-overlay" onClick={onClose}>
      <div className="cm-modal" onClick={e => e.stopPropagation()}>
        <div className="cm-modal-head">
          <h3>{form.id ? 'Editar movimiento' : 'Registrar movimiento'}</h3>
          <button className="cm-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} className="cm-form">
          {/* Tipo */}
          <div className="cm-tipo-row">
            {['EGRESO', 'INGRESO'].map(t => (
              <label key={t} className={`cm-tipo-opt ${form.tipo === t ? 'cm-tipo-opt--active-' + t.toLowerCase() : ''}`}>
                <input
                  type="radio"
                  name="tipo"
                  value={t}
                  checked={form.tipo === t}
                  onChange={() => f('tipo', t)}
                  hidden
                />
                {t === 'EGRESO' ? '↑ Egreso (gasto)' : '↓ Ingreso (recarga)'}
              </label>
            ))}
          </div>

          <div className="cm-field-row">
            <label>Fecha *
              <input required type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)} />
            </label>
            <label>Monto (COP) *
              <input required type="number" min="1" step="1" placeholder="0" value={form.monto} onChange={e => f('monto', e.target.value)} />
            </label>
          </div>

          <label>Descripción *
            <input required placeholder="Ej: Compra de tintas, taxi, etc." value={form.descripcion} onChange={e => f('descripcion', e.target.value)} />
          </label>

          <div className="cm-field-row">
            <label>Categoría
              <select value={form.categoria} onChange={e => f('categoria', e.target.value)}>
                {CATEGORIAS_CM.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Responsable
              <input placeholder="Nombre del responsable" value={form.responsable} onChange={e => f('responsable', e.target.value)} />
            </label>
          </div>

          <label>N° Comprobante
            <input placeholder="Factura, recibo, etc." value={form.comprobante} onChange={e => f('comprobante', e.target.value)} />
          </label>

          <label>Notas
            <textarea rows={2} placeholder="Observaciones…" value={form.notas} onChange={e => f('notas', e.target.value)} />
          </label>

          <div className="cm-modal-foot">
            <button type="button" className="cm-btn-sec" onClick={onClose}>Cancelar</button>
            <button type="submit" className={`cm-btn-pri cm-btn-pri--${(form.tipo || 'egreso').toLowerCase()}`} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CajaMenor() {
  const [movimientos, setMovimientos] = useState([])
  const [resumen,     setResumen]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [modal,       setModal]       = useState(null)
  const [filtros,     setFiltros]     = useState({ desde: isoDesde(30), hasta: isoHoy(), tipo: '' })

  const cargar = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [rMov, rRes] = await Promise.all([
        cajaMenorApi.listar({ desde: filtros.desde, hasta: filtros.hasta, tipo: filtros.tipo || undefined }),
        cajaMenorApi.resumen({ desde: filtros.desde, hasta: filtros.hasta }),
      ])
      setMovimientos(rMov.data.movimientos || [])
      setResumen(rRes.data)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || ''
      setError(msg.includes('does not exist')
        ? 'La tabla caja_menor no existe aún. Ejecuta la migración SQL en Supabase.'
        : `Error al cargar: ${msg}`)
    } finally { setLoading(false) }
  }, [filtros])

  useEffect(() => { cargar() }, [cargar])

  async function eliminar(m) {
    if (!confirm(`¿Eliminar "${m.descripcion}"?`)) return
    await cajaMenorApi.eliminar(m.id)
    cargar()
  }

  const saldoColor = resumen?.saldo >= 0 ? 'var(--success)' : 'var(--danger)'

  return (
    <div className="cm-page">
      {/* Header */}
      <div className="cm-header">
        <div>
          <h2 className="cm-titulo">Caja Menor</h2>
          <p className="cm-sub muted">Control de gastos menores y recargas de caja</p>
        </div>
        <div className="cm-header-btns">
          <button className="cm-btn-ingreso" onClick={() => setModal({ tipo: 'INGRESO', fecha: isoHoy(), descripcion: '', categoria: 'RECARGAS', monto: '', comprobante: '', responsable: '', notas: '' })}>
            ↓ Recarga
          </button>
          <button className="cm-btn-egreso" onClick={() => setModal('nuevo')}>
            ↑ Gasto
          </button>
        </div>
      </div>

      {error && (
        <div className="cm-error">⚠️ {error}</div>
      )}

      {/* KPIs */}
      {resumen && (
        <div className="cm-kpis">
          <div className="cm-kpi cm-kpi--saldo">
            <p className="cm-kpi-label">Saldo disponible</p>
            <p className="cm-kpi-val" style={{ color: saldoColor }}>{COP(resumen.saldo)}</p>
            <p className="cm-kpi-sub muted">{resumen.num_movimientos} movimientos en el período</p>
          </div>
          <div className="cm-kpi">
            <p className="cm-kpi-label">Total ingresos</p>
            <p className="cm-kpi-val cm-green">{COP(resumen.ingresos)}</p>
          </div>
          <div className="cm-kpi">
            <p className="cm-kpi-label">Total egresos</p>
            <p className="cm-kpi-val cm-red">{COP(resumen.egresos)}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="cm-filtros">
        <div className="cmf-group">
          <label>Desde</label>
          <input type="date" value={filtros.desde} onChange={e => setFiltros(p => ({ ...p, desde: e.target.value }))} />
        </div>
        <div className="cmf-group">
          <label>Hasta</label>
          <input type="date" value={filtros.hasta} onChange={e => setFiltros(p => ({ ...p, hasta: e.target.value }))} />
        </div>
        <div className="cmf-group">
          <label>Tipo</label>
          <select value={filtros.tipo} onChange={e => setFiltros(p => ({ ...p, tipo: e.target.value }))}>
            <option value="">Todos</option>
            <option value="EGRESO">Egresos</option>
            <option value="INGRESO">Ingresos</option>
          </select>
        </div>
        <button className="cmf-clear" onClick={() => setFiltros({ desde: isoDesde(30), hasta: isoHoy(), tipo: '' })}>
          Limpiar
        </button>
      </div>

      {/* Listado */}
      {loading ? (
        <div className="cm-loading"><div className="spinner" /></div>
      ) : movimientos.length === 0 ? (
        <div className="cm-empty">
          <p>No hay movimientos en este período.</p>
          <button className="cm-btn-egreso" onClick={() => setModal('nuevo')}>Registrar primer gasto</button>
        </div>
      ) : (
        <div className="cm-tabla card">
          <div className="cm-tabla-head">
            <span>Fecha</span>
            <span>Descripción</span>
            <span>Categoría</span>
            <span>Responsable</span>
            <span>Tipo</span>
            <span style={{ textAlign: 'right' }}>Monto</span>
            <span></span>
          </div>
          {movimientos.map(m => (
            <div key={m.id} className={`cm-row cm-row--${m.tipo.toLowerCase()}`}>
              <span className="cm-fecha">{m.fecha}</span>
              <div>
                <p className="cm-desc">{m.descripcion}</p>
                {m.comprobante && <p className="muted cm-comp" style={{ fontSize: 11 }}>#{m.comprobante}</p>}
              </div>
              <span className="muted" style={{ fontSize: 12 }}>{m.categoria}</span>
              <span className="muted" style={{ fontSize: 12 }}>{m.responsable || '—'}</span>
              <span className={`cm-badge cm-badge--${m.tipo.toLowerCase()}`}>
                {m.tipo === 'EGRESO' ? '↑ Gasto' : '↓ Recarga'}
              </span>
              <span className={`cm-monto cm-monto--${m.tipo.toLowerCase()}`}>
                {m.tipo === 'EGRESO' ? '−' : '+'}{COP(m.monto)}
              </span>
              <div className="cm-acciones">
                <button className="cm-icon-btn" onClick={() => setModal(m)} title="Editar">✏️</button>
                <button className="cm-icon-btn cm-icon-btn--danger" onClick={() => eliminar(m)} title="Eliminar">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          mov={modal === 'nuevo' ? null : modal}
          onSave={() => { setModal(null); cargar() }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
