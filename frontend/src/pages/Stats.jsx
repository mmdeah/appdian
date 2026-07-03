import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { statsApi, gastosApi } from '../api/client'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import './Stats.css'

// ── Presets de período ────────────────────────────────────────────────────────
const PRESETS = [
  { label: 'Hoy',    days: 0   },
  { label: '7 días', days: 7   },
  { label: '30 días',days: 30  },
  { label: '90 días',days: 90  },
  { label: '1 año',  days: 365 },
]

const SUGERENCIAS = [
  { emoji: '📈', texto: '¿Cómo están mis ventas vs el período anterior?' },
  { emoji: '👑', texto: '¿Cuáles son mis clientes más rentables?' },
  { emoji: '🛒', texto: '¿Qué productos debería promover más?' },
  { emoji: '🧾', texto: '¿Cuánto IVA debo declarar en este período?' },
  { emoji: '📊', texto: 'Dame un resumen ejecutivo de mi contabilidad' },
  { emoji: '⚠️', texto: '¿Hay alguna alerta o riesgo en mis finanzas?' },
]

// Colores para categorías de gastos
const CAT_COLORS = ['#6366f1','#0ea5e9','#f59e0b','#10b981','#3b82f6','#8b5cf6','#f43f5e','#64748b','#06b6d4','#dc2626','#84cc16','#a855f7','#0891b2','#94a3b8']

function isoHoy() { return new Date().toISOString().split('T')[0] }
function isoDesde(days) {
  const d = new Date(); d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}
function fmt(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n || 0)
}
function fmtK(v) {
  if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v/1_000).toFixed(0)}K`
  return `$${v}`
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderInline(str) {
  const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2,-2)}</strong>
    if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i}>{p.slice(1,-1)}</em>
    if (p.startsWith('`')  && p.endsWith('`'))  return <code key={i} className="md-code">{p.slice(1,-1)}</code>
    return p
  })
}

function MarkdownRenderer({ text }) {
  const lines = text.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const raw  = lines[i]
    const line = raw.trim()
    if (!line) { i++; continue }
    if (line.startsWith('### ')) { out.push(<h3 key={i} className="md-h3">{renderInline(line.slice(4))}</h3>); i++ }
    else if (line.startsWith('## '))  { out.push(<h2 key={i} className="md-h2">{renderInline(line.slice(3))}</h2>); i++ }
    else if (line.startsWith('# '))   { out.push(<h1 key={i} className="md-h1">{renderInline(line.slice(2))}</h1>); i++ }
    else if (/^[-*_]{3,}$/.test(line)) { out.push(<hr key={i} className="md-hr" />); i++ }
    else if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim()); i++ }
      const data = rows.filter(r => !/^\|[\s|:-]+\|$/.test(r))
      if (data.length > 0) {
        const parse = r => r.split('|').slice(1,-1).map(c => c.trim())
        const [head, ...body] = data
        out.push(
          <div key={`t${i}`} className="md-table-wrap">
            <table className="md-table">
              <thead><tr>{parse(head).map((c,j) => <th key={j}>{renderInline(c)}</th>)}</tr></thead>
              <tbody>{body.map((row,ri) => <tr key={ri}>{parse(row).map((c,ci) => <td key={ci}>{renderInline(c)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )
      }
    } else if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s/, '')); i++ }
      out.push(<ol key={`ol${i}`} className="md-ol">{items.map((it,j) => <li key={j}>{renderInline(it)}</li>)}</ol>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = []
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) { items.push(lines[i].trim().slice(2)); i++ }
      out.push(<ul key={`ul${i}`} className="md-ul">{items.map((it,j) => <li key={j}>{renderInline(it)}</li>)}</ul>)
    } else if (line.startsWith('> ')) {
      out.push(<blockquote key={i} className="md-blockquote">{renderInline(line.slice(2))}</blockquote>); i++
    } else {
      out.push(<p key={i} className="md-p">{renderInline(line)}</p>); i++
    }
  }
  return <>{out}</>
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, variacion, color }) {
  const sube = variacion > 0
  return (
    <div className="kpi-card" style={color ? { borderTopColor: color, borderTopWidth: 3 } : {}}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value" style={color ? { color } : {}}>{value}</p>
      {variacion != null && (
        <span className={`kpi-var ${sube ? 'kpi-var--up' : 'kpi-var--down'}`}>
          {sube ? '↑' : '↓'} {Math.abs(variacion)}% vs período anterior
        </span>
      )}
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Stats() {
  const navigate = useNavigate()

  const [presetIdx, setPresetIdx] = useState(2)
  const [desde,  setDesde]  = useState(() => isoDesde(30))
  const [hasta,  setHasta]  = useState(() => isoHoy())
  const [agrup,  setAgrup]  = useState('mes')

  const [resumen,   setResumen]   = useState(null)
  const [tendencia, setTendencia] = useState([])
  const [clientes,  setClientes]  = useState([])
  const [productos, setProductos] = useState([])
  const [gastos,    setGastos]    = useState(null)
  const [flujo,     setFlujo]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const [pregunta,   setPregunta]   = useState('')
  const [analizando, setAnalizando] = useState(false)
  const [respIA,     setRespIA]     = useState(null)
  const [errIA,      setErrIA]      = useState(null)
  const [tsIA,       setTsIA]       = useState(null)

  function aplicarPreset(idx) {
    setPresetIdx(idx)
    const p = PRESETS[idx]
    setHasta(isoHoy())
    setDesde(p.days === 0 ? isoHoy() : isoDesde(p.days))
  }

  const cargar = useCallback(async () => {
    if (!desde || !hasta) return
    setLoading(true); setError(null)

    // Estadísticas de facturas — críticas
    try {
      const [r,t,c,p] = await Promise.all([
        statsApi.resumen({ desde, hasta }),
        statsApi.tendencia({ desde, hasta, agrupacion: agrup }),
        statsApi.topClientes({ desde, hasta }),
        statsApi.topProductos({ desde, hasta }),
      ])
      setResumen(r.data); setTendencia(t.data)
      setClientes(c.data); setProductos(p.data)
    } catch {
      setError('No se pudieron cargar las estadísticas de ventas.')
    } finally {
      setLoading(false)
    }

    // Gastos — opcional (tabla puede no existir aún)
    try {
      const [g, fl] = await Promise.all([
        gastosApi.resumen({ desde, hasta }),
        gastosApi.flujo({ desde, hasta, agrupacion: agrup }),
      ])
      setGastos(g.data); setFlujo(fl.data)
    } catch { /* tabla gastos aún no creada, se muestra vacío */ }
  }, [desde, hasta, agrup])

  useEffect(() => { cargar() }, [cargar])

  async function handleAnalizar() {
    if (!pregunta.trim() || analizando) return
    setAnalizando(true); setRespIA(null); setErrIA(null); setTsIA(null)
    try {
      const ctx = { periodo: { desde, hasta }, resumen, tendencia_ventas: tendencia, top_clientes: clientes, top_productos: productos, gastos }
      const { data } = await statsApi.ai({ pregunta, contexto: ctx })
      setRespIA(data.respuesta)
      setTsIA(new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' }))
    } catch (e) {
      const msg = e.response?.data?.error || e.message || ''
      if (msg.includes('saturación'))       setErrIA('El modelo está saturado. Espera unos segundos e intenta de nuevo.')
      else if (e.code === 'ECONNABORTED')   setErrIA('El modelo tardó demasiado. Intenta de nuevo.')
      else setErrIA('Error al consultar el agente. Verifica OPENROUTER_API_KEY en Railway.')
    } finally { setAnalizando(false) }
  }

  function irAReporte() {
    navigate('/estadisticas/reporte', {
      state: { periodo: { desde, hasta }, resumen, tendencia, clientes, productos, gastos, flujo }
    })
  }

  const utilidad_bruta = (resumen?.total_ventas || 0) - (gastos?.total_gastos || 0)
  const margen_pct = resumen?.total_ventas > 0
    ? ((utilidad_bruta / resumen.total_ventas) * 100).toFixed(1)
    : 0

  const ttStyle = { background:'var(--surface)', border:'1px solid var(--border-mid)', borderRadius:8, fontSize:12 }

  return (
    <div className="stats-page">

      {/* ── Toolbar ── */}
      <div className="stats-toolbar">
        <div className="toolbar-presets">
          {PRESETS.map((p,i) => (
            <button key={p.label}
              className={`preset-btn ${presetIdx===i ? 'preset-btn--active':''}`}
              onClick={() => aplicarPreset(i)}
            >{p.label}</button>
          ))}
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-dates">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" className="toolbar-cal-icon">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <input type="date" className="toolbar-date-input" value={desde}
            onChange={e => { setDesde(e.target.value); setPresetIdx(-1) }} />
          <span className="toolbar-arrow">→</span>
          <input type="date" className="toolbar-date-input" value={hasta}
            onChange={e => { setHasta(e.target.value); setPresetIdx(-1) }} />
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-agrup">
          <select className="toolbar-select" value={agrup} onChange={e => setAgrup(e.target.value)}>
            <option value="dia">Por día</option>
            <option value="semana">Por semana</option>
            <option value="mes">Por mes</option>
          </select>
        </div>
        <div className="toolbar-divider" />
        {/* Botón reporte */}
        <button className="btn-reporte" onClick={irAReporte}>
          📄 Generar reporte
        </button>
      </div>

      {error && <div className="stats-error">{error}</div>}

      {loading ? (
        <div className="stats-loading"><div className="spinner" /></div>
      ) : (
        <>
          {/* ── KPIs Ingresos ── */}
          <p className="stats-section-label">📈 Ingresos</p>
          <div className="kpi-grid">
            <KpiCard label="Total Ventas"    value={fmt(resumen?.total_ventas)}  variacion={resumen?.comparacion?.variacion_pct} />
            <KpiCard label="IVA Cobrado"     value={fmt(resumen?.total_iva)}     sub={`${resumen?.num_facturas||0} facturas`} />
            <KpiCard label="Ticket Promedio" value={fmt(resumen?.promedio)}      sub={`POS: ${resumen?.por_tipo?.POS||0}  ·  FE: ${resumen?.por_tipo?.FE||0}`} />
            <KpiCard label="Base Gravable"   value={fmt(resumen?.total_subtotal)} sub="Sin IVA" />
          </div>

          {/* ── KPIs Gastos + Resultado ── */}
          <p className="stats-section-label">💸 Gastos y resultado</p>
          <div className="kpi-grid">
            <KpiCard label="Total Gastos"    value={fmt(gastos?.total_gastos)}  sub={`${gastos?.num_gastos||0} registros`} color="#dc2626" />
            <KpiCard label="IVA Pagado"      value={fmt(gastos?.total_iva)}     sub="Descontable en declaración" />
            <KpiCard
              label="Utilidad Bruta"
              value={fmt(utilidad_bruta)}
              sub={`Margen: ${margen_pct}%`}
              color={utilidad_bruta >= 0 ? '#16a34a' : '#dc2626'}
            />
            <KpiCard label="Gastos / Ventas" value={resumen?.total_ventas > 0 ? `${((gastos?.total_gastos||0)/resumen.total_ventas*100).toFixed(1)}%` : '—'} sub="Porcentaje de egresos" />
          </div>

          {/* ── Tendencia de Ventas ── */}
          <div className="chart-card">
            <h3 className="chart-title">Tendencia de Ventas</h3>
            {tendencia.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={tendencia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-low)" />
                  <XAxis dataKey="fecha" tick={{ fontSize:11, fill:'var(--muted)' }} stroke="var(--border-mid)" />
                  <YAxis tick={{ fontSize:11, fill:'var(--muted)' }} stroke="var(--border-mid)" tickFormatter={fmtK} />
                  <Tooltip formatter={v=>[fmt(v),'Ventas']} contentStyle={ttStyle} labelStyle={{ color:'var(--text)', fontWeight:600 }} />
                  <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2.5} dot={false} activeDot={{ r:5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">Sin datos en este período</div>}
          </div>

          {/* ── Flujo de caja: Ingresos vs Gastos ── */}
          {flujo.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">Flujo de Caja — Ingresos vs Gastos</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={flujo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-low)" />
                  <XAxis dataKey="fecha" tick={{ fontSize:11, fill:'var(--muted)' }} stroke="var(--border-mid)" />
                  <YAxis tick={{ fontSize:11, fill:'var(--muted)' }} stroke="var(--border-mid)" tickFormatter={fmtK} />
                  <Tooltip
                    formatter={(v, name) => [fmt(v), name === 'ingresos' ? 'Ingresos' : name === 'gastos' ? 'Gastos' : 'Utilidad']}
                    contentStyle={ttStyle}
                    labelStyle={{ color:'var(--text)', fontWeight:600 }}
                  />
                  <Legend formatter={n => n === 'ingresos' ? 'Ingresos' : n === 'gastos' ? 'Gastos' : 'Utilidad'} />
                  <Line type="monotone" dataKey="ingresos"  stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="gastos"    stroke="#dc2626" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="utilidad"  stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Tops ── */}
          <div className="top-grid">
            <div className="chart-card">
              <h3 className="chart-title">Top Clientes por Ingresos</h3>
              {clientes.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={clientes.slice(0,7)} layout="vertical" margin={{ left:8, right:8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-low)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize:10, fill:'var(--muted)' }} stroke="var(--border-mid)" tickFormatter={fmtK} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize:10, fill:'var(--muted)' }} stroke="var(--border-mid)" width={110} />
                    <Tooltip formatter={v=>[fmt(v),'Ventas']} contentStyle={ttStyle} />
                    <Bar dataKey="total" fill="var(--accent)" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="chart-empty">Sin datos</div>}
            </div>
            <div className="chart-card">
              <h3 className="chart-title">Top Productos por Ingresos</h3>
              {productos.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={productos.slice(0,7)} layout="vertical" margin={{ left:8, right:8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-low)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize:10, fill:'var(--muted)' }} stroke="var(--border-mid)" tickFormatter={fmtK} />
                    <YAxis type="category" dataKey="nombre" tick={{ fontSize:10, fill:'var(--muted)' }} stroke="var(--border-mid)" width={110} />
                    <Tooltip formatter={v=>[fmt(v),'Ingresos']} contentStyle={ttStyle} />
                    <Bar dataKey="total" fill="#7c3aed" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="chart-empty">Sin datos</div>}
            </div>
          </div>

          {/* ── Gastos por categoría (pie) ── */}
          {gastos?.categorias?.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">Gastos por Categoría</h3>
              <div className="gastos-cat-layout">
                <ResponsiveContainer width="45%" height={240}>
                  <PieChart>
                    <Pie
                      data={gastos.categorias}
                      dataKey="total"
                      nameKey="nombre"
                      cx="50%" cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={2}
                    >
                      {gastos.categorias.map((_, idx) => (
                        <Cell key={idx} fill={CAT_COLORS[idx % CAT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v=>[fmt(v),'Gasto']} contentStyle={ttStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="cat-legend">
                  {gastos.categorias.slice(0,8).map((c, idx) => (
                    <div key={c.nombre} className="cat-legend-item">
                      <span className="cat-dot" style={{ background: CAT_COLORS[idx % CAT_COLORS.length] }} />
                      <span className="cat-legend-nombre">{c.nombre.replace('_', ' ')}</span>
                      <span className="cat-legend-val">{fmt(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Agente IA ── */}
          <div className="ai-shell">
            <div className="ai-hero">
              <div className="ai-hero-glow" />
              <div className="ai-hero-content">
                <div className="ai-avatar">
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                    <circle cx="8.5" cy="14.5" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <div className="ai-hero-text">
                  <h2 className="ai-hero-title">Agente Contable IA</h2>
                  <p className="ai-hero-sub">Pregunta sobre tus finanzas en lenguaje natural</p>
                </div>
                <div className="ai-model-badge">
                  <span className="ai-model-dot" />
                  Nvidia Nemotron 550B
                </div>
              </div>
            </div>

            <div className="ai-body">
              <p className="ai-section-label">Preguntas frecuentes</p>
              <div className="ai-chips">
                {SUGERENCIAS.map(s => (
                  <button key={s.texto} className="ai-chip" onClick={() => setPregunta(s.texto)}>
                    <span className="ai-chip-emoji">{s.emoji}</span>
                    {s.texto}
                  </button>
                ))}
              </div>

              <div className="ai-input-wrap">
                <textarea
                  className="ai-input"
                  placeholder="Describe qué quieres analizar de tus finanzas..."
                  value={pregunta}
                  onChange={e => setPregunta(e.target.value)}
                  rows={3}
                  onKeyDown={e => { if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) handleAnalizar() }}
                />
                <div className="ai-input-footer">
                  <span className="ai-hint">Ctrl+Enter para enviar</span>
                  <button className="ai-send-btn" onClick={handleAnalizar} disabled={analizando || !pregunta.trim()}>
                    {analizando ? (
                      <><span className="ai-spinner" /> Analizando…</>
                    ) : (
                      <>Analizar
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft:6 }}>
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {errIA && (
                <div className="ai-error-banner">
                  <span>⚠️</span> {errIA}
                  <button className="ai-retry" onClick={handleAnalizar}>Reintentar</button>
                </div>
              )}

              {respIA && (
                <div className="ai-response-card">
                  <div className="ai-response-header">
                    <div className="ai-response-badge">
                      <span className="ai-response-dot" />Respuesta del agente
                    </div>
                    {tsIA && <span className="ai-response-ts">{tsIA}</span>}
                  </div>
                  <div className="ai-response-body">
                    <MarkdownRenderer text={respIA} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
