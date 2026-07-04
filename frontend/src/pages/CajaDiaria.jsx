import { useState, useEffect } from 'react'
import { cajaDiariaApi } from '../api/client'
import './CajaDiaria.css'

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
function isoHoy() { return new Date().toISOString().split('T')[0] }

const MEDIO_ICONS = {
  'Efectivo':       '💵',
  'Transferencia':  '🏦',
  'Tarjeta débito': '💳',
  'Tarjeta crédito':'💳',
  'Bono / Vale':    '🎟️',
}

function DifBadge({ dif }) {
  if (dif === 0) return <span className="cd-dif cd-dif--ok">✓ Cuadrado</span>
  if (dif > 0)   return <span className="cd-dif cd-dif--sobre">+{COP(dif)} sobrante</span>
  return <span className="cd-dif cd-dif--faltante">{COP(dif)} faltante</span>
}

export default function CajaDiaria() {
  const [fecha,     setFecha]     = useState(isoHoy())
  const [data,      setData]      = useState(null)
  const [historial, setHistorial] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // Cierre form
  const [contado,    setContado]   = useState('')
  const [cerradoPor, setCerradoPor]= useState('')
  const [notas,      setNotas]     = useState('')
  const [saving,     setSaving]    = useState(false)
  const [cierreOk,   setCierreOk]  = useState(false)

  async function cargar(f = fecha) {
    setLoading(true); setError(null); setCierreOk(false)
    try {
      const [rDia, rHist] = await Promise.all([
        cajaDiariaApi.resumenDia(f),
        cajaDiariaApi.historial(),
      ])
      setData(rDia.data)
      setHistorial(rHist.data.cierres || [])
      // Pre-fill contado si ya hubo cierre
      if (rDia.data.cierre) {
        setContado(String(rDia.data.cierre.efectivo_contado))
        setCerradoPor(rDia.data.cierre.cerrado_por || '')
        setNotas(rDia.data.cierre.notas || '')
      } else {
        setContado('')
        setCerradoPor('')
        setNotas('')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [fecha])

  async function cerrarCaja(e) {
    e.preventDefault()
    if (!data) return
    setSaving(true)
    try {
      await cajaDiariaApi.registrarCierre({
        fecha,
        total_ventas:      data.total_ventas,
        total_iva:         data.total_iva,
        total_subtotal:    data.total_subtotal,
        efectivo_esperado: data.efectivo_esperado,
        efectivo_contado:  +contado || 0,
        num_transacciones: data.num_transacciones,
        notas,
        cerrado_por: cerradoPor,
      })
      setCierreOk(true)
      cargar(fecha)
    } catch (err) {
      alert(err.response?.data?.error || 'Error al registrar cierre')
    } finally { setSaving(false) }
  }

  const diferencia = (+contado || 0) - (data?.efectivo_esperado || 0)
  const yaCerrado  = !!data?.cierre

  return (
    <div className="cd-page">

      {/* ── Header ── */}
      <div className="cd-header">
        <div>
          <h2 className="cd-titulo">Caja Diaria</h2>
          <p className="cd-sub muted">Resumen de ventas y cierre de caja por día</p>
        </div>
        <div className="cd-date-wrap">
          <label className="cd-date-label caps muted">Fecha</label>
          <input
            className="cd-date-input"
            type="date"
            value={fecha}
            max={isoHoy()}
            onChange={e => setFecha(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="cd-error">⚠️ {error}</div>}

      {loading ? (
        <div className="cd-loading"><div className="spinner" /></div>
      ) : !data ? null : (
        <>
          {/* ── KPIs ── */}
          <div className="cd-kpis">
            <div className="cd-kpi cd-kpi--primary">
              <p className="cd-kpi-label">Total ventas</p>
              <p className="cd-kpi-val">{COP(data.total_ventas)}</p>
              <p className="cd-kpi-sub muted">{data.num_transacciones} transacciones</p>
            </div>
            <div className="cd-kpi">
              <p className="cd-kpi-label">Subtotal (sin IVA)</p>
              <p className="cd-kpi-val">{COP(data.total_subtotal)}</p>
            </div>
            <div className="cd-kpi">
              <p className="cd-kpi-label">IVA recaudado</p>
              <p className="cd-kpi-val cd-accent">{COP(data.total_iva)}</p>
            </div>
            <div className="cd-kpi cd-kpi--cash">
              <p className="cd-kpi-label">💵 Efectivo esperado</p>
              <p className="cd-kpi-val cd-green">{COP(data.efectivo_esperado)}</p>
              <p className="cd-kpi-sub muted">Ventas en efectivo del día</p>
            </div>
          </div>

          {/* ── Desglose ── */}
          <div className="cd-row-2">

            {/* Por tipo */}
            <div className="cd-card">
              <p className="cd-card-title caps muted">Por tipo de documento</p>
              <div className="cd-tipo-grid">
                <div className="cd-tipo">
                  <span className="cd-tipo-icon">🖥️</span>
                  <div>
                    <p className="cd-tipo-label">POS</p>
                    <p className="cd-tipo-val">{COP(data.por_tipo?.POS?.total)}</p>
                    <p className="muted" style={{ fontSize: 11, margin: 0 }}>{data.por_tipo?.POS?.count || 0} facturas</p>
                  </div>
                </div>
                <div className="cd-tipo">
                  <span className="cd-tipo-icon">📄</span>
                  <div>
                    <p className="cd-tipo-label">FE</p>
                    <p className="cd-tipo-val">{COP(data.por_tipo?.FE?.total)}</p>
                    <p className="muted" style={{ fontSize: 11, margin: 0 }}>{data.por_tipo?.FE?.count || 0} facturas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Por medio de pago */}
            <div className="cd-card">
              <p className="cd-card-title caps muted">Por medio de pago</p>
              {data.por_medio_pago?.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>Sin ventas en esta fecha</p>
              ) : (
                <div className="cd-medios-lista">
                  {(data.por_medio_pago || []).map(mp => (
                    <div key={mp.id} className="cd-medio">
                      <span className="cd-medio-icon">{MEDIO_ICONS[mp.nombre] || '💰'}</span>
                      <span className="cd-medio-nombre">{mp.nombre}</span>
                      <span className="cd-medio-count muted">{mp.count} tx</span>
                      <span className="cd-medio-total">{COP(mp.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Cierre de caja ── */}
          <div className="cd-cierre-panel">
            <div className="cd-cierre-head">
              <p className="cd-cierre-titulo">
                {yaCerrado ? '✅ Caja cerrada' : '🔒 Cerrar caja'}
              </p>
              {yaCerrado && (
                <span className="cd-ya-cerrado">
                  Cerrado por {data.cierre.cerrado_por || '—'}
                </span>
              )}
            </div>

            <form onSubmit={cerrarCaja} className="cd-cierre-form">
              <div className="cd-cierre-row">
                <div className="cd-cierre-field">
                  <label>Efectivo esperado</label>
                  <div className="cd-cierre-readonly">{COP(data.efectivo_esperado)}</div>
                </div>
                <div className="cd-cierre-field">
                  <label>Efectivo contado *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={contado}
                    onChange={e => setContado(e.target.value)}
                  />
                </div>
                <div className="cd-cierre-field">
                  <label>Diferencia</label>
                  <div className={`cd-cierre-readonly ${diferencia > 0 ? 'cd-green' : diferencia < 0 ? 'cd-red' : ''}`}>
                    {contado !== '' ? (diferencia >= 0 ? '+' : '') + COP(diferencia) : '—'}
                  </div>
                </div>
              </div>

              <div className="cd-cierre-row">
                <div className="cd-cierre-field">
                  <label>Cerrado por</label>
                  <input placeholder="Nombre del cajero" value={cerradoPor} onChange={e => setCerradoPor(e.target.value)} />
                </div>
                <div className="cd-cierre-field" style={{ flex: 2 }}>
                  <label>Notas</label>
                  <input placeholder="Observaciones del cierre…" value={notas} onChange={e => setNotas(e.target.value)} />
                </div>
              </div>

              {cierreOk && (
                <div className="cd-cierre-ok">✅ Cierre registrado correctamente</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="cd-btn-cerrar" disabled={saving || data.num_transacciones === 0}>
                  {saving ? 'Guardando…' : yaCerrado ? '↻ Actualizar cierre' : '🔒 Registrar cierre'}
                </button>
              </div>
            </form>
          </div>

          {/* ── Historial ── */}
          {historial.length > 0 && (
            <div className="cd-card">
              <p className="cd-card-title caps muted">Historial de cierres</p>
              <table className="cd-hist-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th style={{ textAlign: 'right' }}>Total ventas</th>
                    <th style={{ textAlign: 'right' }}>Efectivo esperado</th>
                    <th style={{ textAlign: 'right' }}>Efectivo contado</th>
                    <th style={{ textAlign: 'right' }}>Diferencia</th>
                    <th>Cajero</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(c => (
                    <tr key={c.id} className={fecha === c.fecha ? 'cd-hist-hoy' : ''}>
                      <td className="cd-hist-fecha">{c.fecha}</td>
                      <td style={{ textAlign: 'right' }}>{COP(c.total_ventas)}</td>
                      <td style={{ textAlign: 'right' }}>{COP(c.efectivo_esperado)}</td>
                      <td style={{ textAlign: 'right' }}>{COP(c.efectivo_contado)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={c.diferencia === 0 ? 'cd-green' : c.diferencia > 0 ? 'cd-green' : 'cd-red'}>
                          {c.diferencia >= 0 ? '+' : ''}{COP(c.diferencia)}
                        </span>
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>{c.cerrado_por || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
