import { useState, useEffect } from 'react'
import { cajaDiariaApi } from '../api/client'
import './CajaDiaria.css'

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
function isoHoy() { return new Date().toISOString().split('T')[0] }

const MEDIO_META = {
  'Efectivo':        { icon: '💵', color: '#10b981' },
  'Transferencia':   { icon: '🏦', color: '#6366f1' },
  'Tarjeta débito':  { icon: '💳', color: '#3b82f6' },
  'Tarjeta crédito': { icon: '💳', color: '#f59e0b' },
  'Bono / Vale':     { icon: '🎟️', color: '#8b5cf6' },
}

export default function CajaDiaria() {
  const [fecha,      setFecha]     = useState(isoHoy())
  const [data,       setData]      = useState(null)
  const [historial,  setHistorial] = useState([])
  const [loading,    setLoading]   = useState(true)
  const [error,      setError]     = useState(null)
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
      if (rDia.data.cierre) {
        setContado(String(rDia.data.cierre.efectivo_contado))
        setCerradoPor(rDia.data.cierre.cerrado_por || '')
        setNotas(rDia.data.cierre.notas || '')
      } else {
        setContado(''); setCerradoPor(''); setNotas('')
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
  const maxMedio   = data?.por_medio_pago?.length
    ? Math.max(...data.por_medio_pago.map(m => m.total))
    : 1

  return (
    <div className="cd-page">

      {/* ── Header ── */}
      <div className="cd-header">
        <div>
          <h2 className="cd-titulo">Caja Diaria</h2>
          <p className="cd-sub">Resumen de ventas y cierre de caja por día</p>
        </div>
        <div className="cd-date-wrap">
          <span className="cd-date-label">FECHA</span>
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
            <div className="cd-kpi cd-kpi--accent">
              <p className="cd-kpi-label">Total ventas</p>
              <p className="cd-kpi-val">{COP(data.total_ventas)}</p>
              <p className="cd-kpi-sub">{data.num_transacciones} transacciones</p>
            </div>
            <div className="cd-kpi">
              <p className="cd-kpi-label">Subtotal (sin IVA)</p>
              <p className="cd-kpi-val">{COP(data.total_subtotal)}</p>
              <p className="cd-kpi-sub">Base gravable</p>
            </div>
            <div className="cd-kpi">
              <p className="cd-kpi-label">IVA recaudado</p>
              <p className="cd-kpi-val cd-val-accent">{COP(data.total_iva)}</p>
              <p className="cd-kpi-sub">Por declarar</p>
            </div>
            <div className="cd-kpi cd-kpi--dark">
              <p className="cd-kpi-label">Efectivo esperado</p>
              <p className="cd-kpi-val">{COP(data.efectivo_esperado)}</p>
              <p className="cd-kpi-sub">Ventas en efectivo del día</p>
            </div>
          </div>

          {/* ── Desglose ── */}
          <div className="cd-row-2">

            {/* Por tipo de documento */}
            <div className="cd-card">
              <p className="cd-card-title">Por tipo de documento</p>
              <div className="cd-tipo-grid">
                <div className="cd-tipo">
                  <div className="cd-tipo-icon-wrap cd-tipo-icon--pos">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                    </svg>
                  </div>
                  <div>
                    <p className="cd-tipo-tag">POS</p>
                    <p className="cd-tipo-val">{COP(data.por_tipo?.POS?.total)}</p>
                    <p className="cd-tipo-count">{data.por_tipo?.POS?.count || 0} facturas</p>
                  </div>
                </div>
                <div className="cd-tipo">
                  <div className="cd-tipo-icon-wrap cd-tipo-icon--fe">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="cd-tipo-tag">FE</p>
                    <p className="cd-tipo-val">{COP(data.por_tipo?.FE?.total)}</p>
                    <p className="cd-tipo-count">{data.por_tipo?.FE?.count || 0} facturas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Por medio de pago */}
            <div className="cd-card">
              <p className="cd-card-title">Por medio de pago</p>
              {!data.por_medio_pago?.length ? (
                <div className="cd-empty-medio">
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-tertiary)' }}>
                    <rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" />
                  </svg>
                  <p>Sin ventas en esta fecha</p>
                </div>
              ) : (
                <div className="cd-medios-lista">
                  {data.por_medio_pago.map(mp => (
                    <div key={mp.id} className="cd-medio">
                      <span className="cd-medio-icon">{MEDIO_META[mp.nombre]?.icon || '💰'}</span>
                      <div className="cd-medio-info">
                        <div className="cd-medio-top">
                          <span className="cd-medio-nombre">{mp.nombre}</span>
                          <span className="cd-medio-total">{COP(mp.total)}</span>
                        </div>
                        <div className="cd-medio-bar-track">
                          <div
                            className="cd-medio-bar-fill"
                            style={{
                              width: `${Math.round((mp.total / maxMedio) * 100)}%`,
                              background: MEDIO_META[mp.nombre]?.color || 'var(--accent)',
                            }}
                          />
                        </div>
                      </div>
                      <span className="cd-medio-count">{mp.count} tx</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Cierre de caja ── */}
          <div className="cd-cierre-panel">
            <div className="cd-cierre-head">
              <div className="cd-cierre-head-left">
                <div className="cd-cierre-icon-badge">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </div>
                <div>
                  <p className="cd-cierre-titulo">{yaCerrado ? 'Caja cerrada' : 'Cerrar caja'}</p>
                  {yaCerrado && <p className="cd-cierre-sub">Cerrado por {data.cierre.cerrado_por || '—'}</p>}
                </div>
              </div>
              {yaCerrado && <span className="cd-ya-cerrado">✓ Cerrada</span>}
            </div>

            <form onSubmit={cerrarCaja} className="cd-cierre-form">
              {/* 3 campos en fila */}
              <div className="cd-cierre-row">
                <div className="cd-cierre-field">
                  <label>Efectivo esperado</label>
                  <div className="cd-cierre-readonly">{COP(data.efectivo_esperado)}</div>
                </div>
                <div className="cd-cierre-field">
                  <label>Efectivo contado <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="cd-cierre-input cd-cierre-input--highlight"
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
                  <div className={`cd-cierre-readonly ${
                    contado !== '' && diferencia > 0 ? 'cd-cierre-readonly--pos' :
                    contado !== '' && diferencia < 0 ? 'cd-cierre-readonly--neg' : ''
                  }`}>
                    {contado !== '' ? (diferencia >= 0 ? '+' : '') + COP(diferencia) : '—'}
                  </div>
                </div>
              </div>

              {/* Cajero + Notas */}
              <div className="cd-cierre-row">
                <div className="cd-cierre-field">
                  <label>Cerrado por</label>
                  <input
                    className="cd-cierre-input"
                    placeholder="Nombre del cajero"
                    value={cerradoPor}
                    onChange={e => setCerradoPor(e.target.value)}
                  />
                </div>
                <div className="cd-cierre-field cd-cierre-field--wide">
                  <label>Notas</label>
                  <input
                    className="cd-cierre-input"
                    placeholder="Observaciones del cierre…"
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                  />
                </div>
              </div>

              {cierreOk && (
                <div className="cd-cierre-ok">✅ Cierre registrado correctamente</div>
              )}

              <div className="cd-cierre-footer">
                <button
                  type="submit"
                  className="cd-btn-cerrar"
                  disabled={saving || data.num_transacciones === 0}
                >
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  {saving ? 'Guardando…' : yaCerrado ? 'Actualizar cierre' : 'Registrar cierre'}
                </button>
              </div>
            </form>
          </div>

          {/* ── Historial ── */}
          {historial.length > 0 && (
            <div className="cd-card">
              <p className="cd-card-title">Historial de cierres</p>
              <table className="cd-hist-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th style={{ textAlign: 'right' }}>Total ventas</th>
                    <th style={{ textAlign: 'right' }}>Ef. esperado</th>
                    <th style={{ textAlign: 'right' }}>Ef. contado</th>
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
                        <span style={{ color: c.diferencia >= 0 ? '#059669' : 'var(--danger)', fontWeight: 700 }}>
                          {c.diferencia >= 0 ? '+' : ''}{COP(c.diferencia)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.cerrado_por || '—'}</td>
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
