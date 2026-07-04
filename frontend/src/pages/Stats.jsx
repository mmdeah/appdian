import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { statsApi, gastosApi, inventarioApi, cajaDiariaApi, invoicesApi } from '../api/client'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import AiAssistant from '../components/AiAssistant'
import './Stats.css'

// ── helpers ───────────────────────────────────────────────────────────────────
const PRESETS = [
  { label: 'Hoy',    days: 0   },
  { label: '7 días', days: 7   },
  { label: '30 días',days: 30  },
  { label: '90 días',days: 90  },
  { label: '1 año',  days: 365 },
]

const CAT_COLORS = ['#6366f1','#0ea5e9','#f59e0b','#10b981','#3b82f6','#8b5cf6','#f43f5e','#64748b','#06b6d4','#dc2626','#84cc16','#a855f7']

function isoHoy() { return new Date().toISOString().split('T')[0] }
function isoDesde(days) { const d = new Date(); d.setDate(d.getDate()-days); return d.toISOString().split('T')[0] }
function fmt(n) { return new Intl.NumberFormat('es-CO',{ style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n||0) }
function fmtK(v) {
  if (v>=1_000_000) return `$${(v/1_000_000).toFixed(1)}M`
  if (v>=1_000)     return `$${(v/1_000).toFixed(0)}K`
  return `$${v}`
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, variacion, color }) {
  const sube = variacion > 0
  return (
    <div className="kpi-card" style={color ? { borderTopColor:color, borderTopWidth:3 } : {}}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value" style={color ? { color } : {}}>{value}</p>
      {variacion != null && (
        <span className={`kpi-var ${sube ? 'kpi-var--up':'kpi-var--down'}`}>
          {sube ? '↑':'↓'} {Math.abs(variacion)}% vs período anterior
        </span>
      )}
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
const SUGERENCIAS_DATOS = [
  { emoji:'📈', texto:'¿Cómo están mis ventas vs el período anterior?' },
  { emoji:'👑', texto:'¿Cuáles son mis clientes más rentables?' },
  { emoji:'🧾', texto:'¿Cuánto IVA debo declarar en este período?' },
  { emoji:'💰', texto:'¿Cuál es mi utilidad neta después de gastos?' },
  { emoji:'📦', texto:'¿Cuáles son mis servicios más vendidos?' },
  { emoji:'⚠️', texto:'¿Hay facturas por cobrar que deba seguir?' },
]
const SUGERENCIAS_GENERAL = [
  { emoji:'🏛️', texto:'¿Qué obligaciones tributarias tengo como persona jurídica?' },
  { emoji:'📋', texto:'¿Cómo funciona la retención en la fuente en Colombia?' },
  { emoji:'💼', texto:'¿Cuál es la diferencia entre IVA e INC?' },
  { emoji:'📅', texto:'¿Cuándo vence la declaración de renta 2024?' },
  { emoji:'👥', texto:'¿Qué prestaciones sociales debo pagar a mis empleados?' },
  { emoji:'🔍', texto:'¿Qué es el régimen simple de tributación?' },
]

export default function Stats() {
  const navigate = useNavigate()

  const [presetIdx, setPresetIdx] = useState(2)
  const [desde,  setDesde]  = useState(() => isoDesde(30))
  const [hasta,  setHasta]  = useState(() => isoHoy())
  const [agrup,  setAgrup]  = useState('mes')

  const [resumen,    setResumen]    = useState(null)
  const [tendencia,  setTendencia]  = useState([])
  const [clientes,   setClientes]   = useState([])
  const [productos,  setProductos]  = useState([])
  const [gastos,     setGastos]     = useState(null)
  const [flujo,      setFlujo]      = useState([])
  const [invResumen, setInvResumen] = useState(null)
  const [cajaCierres,setCajaCierres]= useState([])
  const [porCobrar,  setPorCobrar]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  function aplicarPreset(idx) {
    setPresetIdx(idx)
    setHasta(isoHoy())
    setDesde(PRESETS[idx].days === 0 ? isoHoy() : isoDesde(PRESETS[idx].days))
  }

  const cargar = useCallback(async () => {
    if (!desde || !hasta) return
    setLoading(true); setError(null)

    try {
      const [r,t,c,p] = await Promise.all([
        statsApi.resumen({ desde, hasta }),
        statsApi.tendencia({ desde, hasta, agrupacion: agrup }),
        statsApi.topClientes({ desde, hasta }),
        statsApi.topProductos({ desde, hasta }),
      ])
      setResumen(r.data); setTendencia(t.data)
      setClientes(c.data); setProductos(p.data)
    } catch { setError('No se pudieron cargar las estadísticas de ventas.') }
    finally  { setLoading(false) }

    // Opcionales — fallan silenciosamente si la tabla no existe aún
    try {
      const [g, fl] = await Promise.all([
        gastosApi.resumen({ desde, hasta }),
        gastosApi.flujo({ desde, hasta, agrupacion: agrup }),
      ])
      setGastos(g.data); setFlujo(fl.data)
    } catch { /* sin gastos */ }

    try {
      const inv = await inventarioApi.resumen()
      setInvResumen(inv.data)
    } catch { /* sin inventario */ }

    try {
      const hist = await cajaDiariaApi.historial()
      // Filtrar cierres dentro del período seleccionado
      const cierres = (hist.data.cierres || hist.data || [])
        .filter(c => c.fecha >= desde && c.fecha <= hasta)
      setCajaCierres(cierres)
    } catch { /* sin cierres */ }

    try {
      const pc = await invoicesApi.porCobrar()
      setPorCobrar(pc.data.facturas || [])
    } catch { /* sin por cobrar */ }
  }, [desde, hasta, agrup])

  useEffect(() => { cargar() }, [cargar])

  function irAReporte() {
    navigate('/estadisticas/reporte', {
      state: { periodo: { desde, hasta }, resumen, tendencia, clientes, productos, gastos, flujo, cajaDiaria: cajaCierres, inventario: invResumen, porCobrar }
    })
  }

  const utilidad_bruta = (resumen?.total_ventas||0) - (gastos?.total_gastos||0)
  const margen_pct     = resumen?.total_ventas > 0 ? ((utilidad_bruta/resumen.total_ventas)*100).toFixed(1) : 0
  const totalCajaStr   = fmt(cajaCierres.reduce((s,c)=>s+(c.total_ventas||0),0))
  const totalPorCobrar = porCobrar.reduce((s,f)=>s+(f.total||0),0)

  const ttStyle = { background:'var(--surface)', border:'1px solid var(--border-mid)', borderRadius:8, fontSize:12 }

  return (
    <div className="stats-page">

      {/* ── Toolbar ── */}
      <div className="stats-toolbar">
        <div className="toolbar-presets">
          {PRESETS.map((p,i) => (
            <button key={p.label} className={`preset-btn ${presetIdx===i?'preset-btn--active':''}`} onClick={()=>aplicarPreset(i)}>{p.label}</button>
          ))}
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-dates">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" className="toolbar-cal-icon">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <input type="date" className="toolbar-date-input" value={desde} onChange={e=>{setDesde(e.target.value);setPresetIdx(-1)}} />
          <span className="toolbar-arrow">→</span>
          <input type="date" className="toolbar-date-input" value={hasta} onChange={e=>{setHasta(e.target.value);setPresetIdx(-1)}} />
        </div>
        <div className="toolbar-divider" />
        <select className="toolbar-select" value={agrup} onChange={e=>setAgrup(e.target.value)}>
          <option value="dia">Por día</option>
          <option value="semana">Por semana</option>
          <option value="mes">Por mes</option>
        </select>
        <div className="toolbar-divider" />
        <button className="btn-reporte" onClick={irAReporte}>📄 Generar reporte</button>
      </div>

      {error && <div className="stats-error">{error}</div>}

      {loading ? <div className="stats-loading"><div className="spinner"/></div> : (
        <>
          {/* ── KPIs Ingresos ── */}
          <p className="stats-section-label">📈 Ingresos</p>
          <div className="kpi-grid">
            <KpiCard label="Total Ventas"    value={fmt(resumen?.total_ventas)} variacion={resumen?.comparacion?.variacion_pct} />
            <KpiCard label="IVA Cobrado"     value={fmt(resumen?.total_iva)}    sub={`${resumen?.num_facturas||0} facturas`} />
            <KpiCard label="Ticket Promedio" value={fmt(resumen?.promedio)}     sub={`POS: ${resumen?.por_tipo?.POS||0}  ·  FE: ${resumen?.por_tipo?.FE||0}`} />
            <KpiCard label="Base Gravable"   value={fmt(resumen?.total_subtotal)} sub="Sin IVA" />
          </div>

          {/* ── KPIs Gastos + Resultado ── */}
          <p className="stats-section-label">💸 Gastos y resultado</p>
          <div className="kpi-grid">
            <KpiCard label="Total Gastos"    value={fmt(gastos?.total_gastos)} sub={`${gastos?.num_gastos||0} registros`} color="#dc2626" />
            <KpiCard label="IVA Pagado"      value={fmt(gastos?.total_iva)}    sub="Descontable en declaración" />
            <KpiCard label="Utilidad Bruta"  value={fmt(utilidad_bruta)}       sub={`Margen: ${margen_pct}%`} color={utilidad_bruta>=0?'#16a34a':'#dc2626'} />
            <KpiCard label="Gastos / Ventas" value={resumen?.total_ventas>0 ? `${((gastos?.total_gastos||0)/resumen.total_ventas*100).toFixed(1)}%`:'—'} sub="Porcentaje de egresos" />
          </div>

          {/* ── KPIs Caja + Cartera + Inventario ── */}
          <p className="stats-section-label">📦 Caja, cartera e inventario</p>
          <div className="kpi-grid">
            <KpiCard
              label="Ventas en Caja Diaria"
              value={totalCajaStr}
              sub={cajaCierres.length > 0 ? `${cajaCierres.length} cierres en el período` : 'Sin cierres en el período'}
              color="#8b5cf6"
            />
            <KpiCard
              label="Efectivo contado"
              value={fmt(cajaCierres.reduce((s,c)=>s+(c.efectivo_contado||0),0))}
              sub={cajaCierres[0] ? `Último cierre: ${cajaCierres[0].fecha}` : 'Sin cierres registrados'}
            />
            <KpiCard
              label="Cuentas por cobrar"
              value={fmt(totalPorCobrar)}
              sub={`${porCobrar.length} factura${porCobrar.length!==1?'s':''} FE pendiente${porCobrar.length!==1?'s':''}`}
              color={totalPorCobrar > 0 ? '#f59e0b' : undefined}
            />
            <KpiCard
              label="Inventario (valor venta)"
              value={invResumen ? fmt(invResumen.valor_venta) : '—'}
              sub={invResumen ? `${invResumen.total_productos} productos · ${invResumen.bajo_stock} bajo stock` : 'Sin productos físicos'}
              color={invResumen?.bajo_stock > 0 ? '#f59e0b' : undefined}
            />
          </div>

          {/* ── Tendencia de Ventas ── */}
          <div className="chart-card">
            <h3 className="chart-title">Tendencia de Ventas</h3>
            {tendencia.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={tendencia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-low)"/>
                  <XAxis dataKey="fecha" tick={{fontSize:11,fill:'var(--muted)'}} stroke="var(--border-mid)"/>
                  <YAxis tick={{fontSize:11,fill:'var(--muted)'}} stroke="var(--border-mid)" tickFormatter={fmtK}/>
                  <Tooltip formatter={v=>[fmt(v),'Ventas']} contentStyle={ttStyle} labelStyle={{color:'var(--text)',fontWeight:600}}/>
                  <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2.5} dot={false} activeDot={{r:5}}/>
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">Sin datos en este período</div>}
          </div>

          {/* ── Flujo de caja ── */}
          {flujo.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">Flujo de Caja — Ingresos vs Gastos</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={flujo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-low)"/>
                  <XAxis dataKey="fecha" tick={{fontSize:11,fill:'var(--muted)'}} stroke="var(--border-mid)"/>
                  <YAxis tick={{fontSize:11,fill:'var(--muted)'}} stroke="var(--border-mid)" tickFormatter={fmtK}/>
                  <Tooltip formatter={(v,n)=>[fmt(v),n==='ingresos'?'Ingresos':n==='gastos'?'Gastos':'Utilidad']} contentStyle={ttStyle} labelStyle={{color:'var(--text)',fontWeight:600}}/>
                  <Legend formatter={n=>n==='ingresos'?'Ingresos':n==='gastos'?'Gastos':'Utilidad'}/>
                  <Line type="monotone" dataKey="ingresos" stroke="#2563eb" strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="gastos"   stroke="#dc2626" strokeWidth={2} dot={false} strokeDasharray="4 2"/>
                  <Line type="monotone" dataKey="utilidad" stroke="#16a34a" strokeWidth={2} dot={false}/>
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
                  <BarChart data={clientes.slice(0,7)} layout="vertical" margin={{left:8,right:8}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-low)" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:10,fill:'var(--muted)'}} stroke="var(--border-mid)" tickFormatter={fmtK}/>
                    <YAxis type="category" dataKey="nombre" tick={{fontSize:10,fill:'var(--muted)'}} stroke="var(--border-mid)" width={110}/>
                    <Tooltip formatter={v=>[fmt(v),'Ventas']} contentStyle={ttStyle}/>
                    <Bar dataKey="total" fill="var(--accent)" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="chart-empty">Sin datos</div>}
            </div>
            <div className="chart-card">
              <h3 className="chart-title">Top Servicios / Productos por Ingresos</h3>
              {productos.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={productos.slice(0,7)} layout="vertical" margin={{left:8,right:8}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-low)" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:10,fill:'var(--muted)'}} stroke="var(--border-mid)" tickFormatter={fmtK}/>
                    <YAxis type="category" dataKey="nombre" tick={{fontSize:10,fill:'var(--muted)'}} stroke="var(--border-mid)" width={110}/>
                    <Tooltip formatter={v=>[fmt(v),'Ingresos']} contentStyle={ttStyle}/>
                    <Bar dataKey="total" fill="#7c3aed" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="chart-empty">Sin datos</div>}
            </div>
          </div>

          {/* ── Gastos por categoría ── */}
          {gastos?.categorias?.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-title">Gastos por Categoría</h3>
              <div className="gastos-cat-layout">
                <ResponsiveContainer width="45%" height={240}>
                  <PieChart>
                    <Pie data={gastos.categorias} dataKey="total" nameKey="nombre" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                      {gastos.categorias.map((_,idx) => <Cell key={idx} fill={CAT_COLORS[idx%CAT_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v=>[fmt(v),'Gasto']} contentStyle={ttStyle}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="cat-legend">
                  {gastos.categorias.slice(0,8).map((c,idx)=>(
                    <div key={c.nombre} className="cat-legend-item">
                      <span className="cat-dot" style={{background:CAT_COLORS[idx%CAT_COLORS.length]}}/>
                      <span className="cat-legend-nombre">{c.nombre.replace('_',' ')}</span>
                      <span className="cat-legend-val">{fmt(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              AGENTE IA — componente compartido
          ══════════════════════════════════════════════════ */}
          <AiAssistant
            contexto={{
              periodo              : { desde, hasta },
              resumen,
              tendencia_ventas     : tendencia.slice(-10),
              top_clientes         : clientes.slice(0,5),
              top_productos        : productos.slice(0,5),
              gastos,
              inventario           : invResumen,
              caja_diaria          : {
                num_cierres        : cajaCierres.length,
                total_ventas_caja  : cajaCierres.reduce((s,c) => s+(c.total_ventas||0), 0),
                efectivo_contado   : cajaCierres.reduce((s,c) => s+(c.efectivo_contado||0), 0),
                ultimo_cierre      : cajaCierres[0] || null,
              },
              cuentas_por_cobrar   : {
                num_facturas       : porCobrar.length,
                total_pendiente    : porCobrar.reduce((s,f)=>s+(f.total||0),0),
              },
            }}
            sugerenciasD={SUGERENCIAS_DATOS}
            sugerenciasG={SUGERENCIAS_GENERAL}
          />
        </>
      )}
    </div>
  )
}
