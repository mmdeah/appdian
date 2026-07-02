import { useState, useEffect, useCallback } from 'react'
import { statsApi } from '../api/client'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import './Stats.css'

const PRESETS = [
  { label: 'Hoy',       days: 0   },
  { label: '7 días',    days: 7   },
  { label: '30 días',   days: 30  },
  { label: '90 días',   days: 90  },
  { label: '1 año',     days: 365 },
]

function isoHoy() {
  return new Date().toISOString().split('T')[0]
}

function isoDesde(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function fmt(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n || 0)
}

function fmtK(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, variacion }) {
  const sube = variacion > 0
  return (
    <div className="kpi-card">
      <p className="kpi-label muted t-sm">{label}</p>
      <p className="kpi-value">{value}</p>
      {variacion != null && (
        <span className={`kpi-var ${sube ? 'kpi-var--up' : 'kpi-var--down'}`}>
          {sube ? '↑' : '↓'} {Math.abs(variacion)}% vs período anterior
        </span>
      )}
      {sub && <p className="muted t-xs" style={{ marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Stats() {
  const [presetIdx, setPresetIdx] = useState(2)   // 30 días por defecto
  const [desde,  setDesde]  = useState(() => isoDesde(30))
  const [hasta,  setHasta]  = useState(() => isoHoy())
  const [agrup,  setAgrup]  = useState('dia')

  const [resumen,    setResumen]    = useState(null)
  const [tendencia,  setTendencia]  = useState([])
  const [clientes,   setClientes]   = useState([])
  const [productos,  setProductos]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const [pregunta,   setPregunta]   = useState('')
  const [analizando, setAnalizando] = useState(false)
  const [respIA,     setRespIA]     = useState(null)
  const [errIA,      setErrIA]      = useState(null)

  // Cuando cambia preset actualizar fechas
  function aplicarPreset(idx) {
    setPresetIdx(idx)
    const p = PRESETS[idx]
    setHasta(isoHoy())
    setDesde(p.days === 0 ? isoHoy() : isoDesde(p.days))
  }

  const cargar = useCallback(async () => {
    if (!desde || !hasta) return
    setLoading(true)
    setError(null)
    try {
      const [r, t, c, p] = await Promise.all([
        statsApi.resumen({ desde, hasta }),
        statsApi.tendencia({ desde, hasta, agrupacion: agrup }),
        statsApi.topClientes({ desde, hasta }),
        statsApi.topProductos({ desde, hasta }),
      ])
      setResumen(r.data)
      setTendencia(t.data)
      setClientes(c.data)
      setProductos(p.data)
    } catch (e) {
      setError('No se pudieron cargar las estadísticas.')
    } finally {
      setLoading(false)
    }
  }, [desde, hasta, agrup])

  useEffect(() => { cargar() }, [cargar])

  async function handleAnalizar() {
    if (!pregunta.trim() || analizando) return
    setAnalizando(true)
    setRespIA(null)
    setErrIA(null)
    try {
      const ctx = {
        periodo: { desde, hasta },
        resumen,
        tendencia_ventas: tendencia,
        top_clientes: clientes,
        top_productos: productos,
      }
      const { data } = await statsApi.ai({ pregunta, contexto: ctx })
      setRespIA(data.respuesta)
    } catch (e) {
      setErrIA('Error al consultar el agente. Verifica que OPENROUTER_API_KEY esté en Railway.')
    } finally {
      setAnalizando(false)
    }
  }

  const tooltipStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border-mid)',
    borderRadius: 8,
    fontSize: 12,
  }

  return (
    <div className="stats-page">

      {/* ── Toolbar ── */}
      <div className="stats-toolbar">
        <div className="preset-group">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              className={`preset-btn ${presetIdx === i ? 'preset-btn--active' : ''}`}
              onClick={() => aplicarPreset(i)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="date-range">
          <input
            type="date" className="form-input" value={desde}
            onChange={e => { setDesde(e.target.value); setPresetIdx(-1) }}
          />
          <span className="muted">→</span>
          <input
            type="date" className="form-input" value={hasta}
            onChange={e => { setHasta(e.target.value); setPresetIdx(-1) }}
          />
          <select
            className="form-input" value={agrup}
            onChange={e => setAgrup(e.target.value)}
          >
            <option value="dia">Por día</option>
            <option value="semana">Por semana</option>
            <option value="mes">Por mes</option>
          </select>
        </div>
      </div>

      {/* ── Error ── */}
      {error && <div className="stats-error">{error}</div>}

      {/* ── Loading ── */}
      {loading ? (
        <div className="stats-loading"><div className="spinner" /></div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div className="kpi-grid">
            <KpiCard
              label="Total Ventas"
              value={fmt(resumen?.total_ventas)}
              variacion={resumen?.comparacion?.variacion_pct}
            />
            <KpiCard
              label="IVA Cobrado"
              value={fmt(resumen?.total_iva)}
              sub={`${resumen?.num_facturas || 0} facturas aprobadas`}
            />
            <KpiCard
              label="Ticket Promedio"
              value={fmt(resumen?.promedio)}
              sub={`POS: ${resumen?.por_tipo?.POS || 0}  ·  FE: ${resumen?.por_tipo?.FE || 0}`}
            />
            <KpiCard
              label="Base Gravable"
              value={fmt(resumen?.total_subtotal)}
              sub="Sin IVA"
            />
          </div>

          {/* ── Tendencia ── */}
          <div className="chart-card">
            <h3 className="chart-title">Tendencia de Ventas</h3>
            {tendencia.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={tendencia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-low)" />
                  <XAxis
                    dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    stroke="var(--border-mid)"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    stroke="var(--border-mid)"
                    tickFormatter={fmtK}
                  />
                  <Tooltip
                    formatter={(v) => [fmt(v), 'Ventas']}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                  />
                  <Line
                    type="monotone" dataKey="total"
                    stroke="var(--accent)" strokeWidth={2}
                    dot={false} activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">Sin datos en este período</div>
            )}
          </div>

          {/* ── Top Clientes + Top Productos ── */}
          <div className="top-grid">
            <div className="chart-card">
              <h3 className="chart-title">Top Clientes por Ingresos</h3>
              {clientes.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={clientes.slice(0, 7)} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-low)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted)' }} stroke="var(--border-mid)" tickFormatter={fmtK} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: 'var(--muted)' }} stroke="var(--border-mid)" width={110} />
                    <Tooltip formatter={(v) => [fmt(v), 'Ventas']} contentStyle={tooltipStyle} />
                    <Bar dataKey="total" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">Sin datos</div>
              )}
            </div>

            <div className="chart-card">
              <h3 className="chart-title">Top Productos por Ingresos</h3>
              {productos.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={productos.slice(0, 7)} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-low)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted)' }} stroke="var(--border-mid)" tickFormatter={fmtK} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: 'var(--muted)' }} stroke="var(--border-mid)" width={110} />
                    <Tooltip formatter={(v) => [fmt(v), 'Ingresos']} contentStyle={tooltipStyle} />
                    <Bar dataKey="total" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">Sin datos</div>
              )}
            </div>
          </div>

          {/* ── Agente IA ── */}
          <div className="ai-card">
            <div className="ai-card-header">
              <div className="ai-icon-wrap">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="ai-title">Agente Contable IA</h3>
                <p className="muted t-sm">Analiza tus estadísticas con inteligencia artificial · Nvidia Nemotron</p>
              </div>
            </div>

            <div className="ai-suggestions">
              {[
                '¿Cuáles son mis clientes más rentables?',
                '¿Qué productos debería promover más?',
                '¿Cómo están mis ventas comparado con el período anterior?',
                '¿Cuánto IVA debo declarar en este período?',
              ].map(s => (
                <button
                  key={s}
                  className="suggestion-chip"
                  onClick={() => setPregunta(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <textarea
              className="ai-textarea"
              placeholder="Escribe tu pregunta sobre las estadísticas..."
              value={pregunta}
              onChange={e => setPregunta(e.target.value)}
              rows={3}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAnalizar() }}
            />

            <div className="ai-footer">
              <span className="muted t-xs">Ctrl+Enter para enviar</span>
              <button
                className="btn btn-primary"
                onClick={handleAnalizar}
                disabled={analizando || !pregunta.trim()}
              >
                {analizando
                  ? <><span className="google-spinner" style={{ marginRight: 6 }} /> Analizando…</>
                  : 'Analizar'}
              </button>
            </div>

            {errIA && <p className="ai-error">{errIA}</p>}

            {respIA && (
              <div className="ai-response">
                <p className="muted t-xs caps" style={{ marginBottom: 12 }}>Respuesta del agente</p>
                <div className="ai-response-body">
                  {respIA.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
