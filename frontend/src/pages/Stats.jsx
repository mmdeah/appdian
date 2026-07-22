import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { statsApi, gastosApi, inventarioApi, cajaDiariaApi, invoicesApi } from '../api/client'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
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
const CAT_LABELS = { NOMINA:'Nómina', ARRENDAMIENTO:'Arrendamiento', SERVICIOS_PUBLICOS:'Servicios públicos', MATERIA_PRIMA:'Materia prima', MERCANCIA:'Mercancía', SERVICIOS_PROF:'Servicios profesionales', PUBLICIDAD:'Publicidad', MANTENIMIENTO:'Mantenimiento', VIATICOS:'Viáticos', IMPUESTOS:'Impuestos', PAPELERIA:'Papelería', TECNOLOGIA:'Tecnología', FINANCIERO:'Financiero', OTROS:'Otros' }
const GRID_COLOR = '#e2e8f0'
const TICK_COLOR = '#94a3b8'
const AXIS_COLOR = '#cbd5e1'

function isoHoy() { return new Date().toISOString().split('T')[0] }
function isoDesde(days) { const d = new Date(); d.setDate(d.getDate()-days); return d.toISOString().split('T')[0] }
function fmt(n) { return new Intl.NumberFormat('es-CO',{ style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n||0) }
function fmtK(v) {
  if (v>=1_000_000) return `$${(v/1_000_000).toFixed(1)}M`
  if (v>=1_000)     return `$${(v/1_000).toFixed(0)}K`
  return `$${v}`
}

const ttStyle = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:8, fontSize:12, color:'#0f172a' }

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, variacion, valueColor }) {
  const sube = variacion > 0
  return (
    <div className="kpi-card">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value" style={valueColor ? { color: valueColor } : {}}>{value}</p>
      {variacion != null && (
        <span className={`kpi-var ${sube ? 'kpi-var--up':'kpi-var--down'}`}>
          {sube ? '↑':'↓'} {Math.abs(variacion)}% vs período anterior
        </span>
      )}
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
  )
}

// ── Sugerencias ───────────────────────────────────────────────────────────────
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
  const [agrup,  setAgrup]  = useState('dia')

  const [resumen,    setResumen]    = useState(null)
  const [tendencia,  setTendencia]  = useState([])
  const [clientes,   setClientes]   = useState([])
  const [productos,  setProductos]  = useState([])
  const [gastos,     setGastos]     = useState(null)
  const [flujo,      setFlujo]      = useState([])
  const [invResumen, setInvResumen] = useState(null)
  const [cajaCierres,setCajaCierres]= useState([])
  const [porCobrar,  setPorCobrar]  = useState([])
  const [pyg,        setPyg]        = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  function aplicarPreset(idx) {
    setPresetIdx(idx)
    const days = PRESETS[idx].days
    setHasta(isoHoy())
    setDesde(days === 0 ? isoHoy() : isoDesde(days))
    setAgrup(days <= 7 ? 'dia' : days <= 90 ? 'dia' : days <= 180 ? 'semana' : 'mes')
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
      const cierres = (hist.data.cierres || hist.data || [])
        .filter(c => c.fecha >= desde && c.fecha <= hasta)
      setCajaCierres(cierres)
    } catch { /* sin cierres */ }

    try {
      const pc = await invoicesApi.porCobrar()
      setPorCobrar(pc.data.facturas || [])
    } catch { /* sin por cobrar */ }

    try {
      const p = await statsApi.pyg({ desde, hasta })
      setPyg(p.data)
    } catch { /* sin pyg */ }
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
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{color:'#94a3b8',flexShrink:0}}>
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
        <button className="btn-reporte" onClick={irAReporte}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          Generar reporte
        </button>
      </div>

      {error && <div className="stats-error">{error}</div>}

      {loading ? <div className="stats-loading"><div className="stats-spinner"/></div> : (
        <>
          {/* ── KPIs Ingresos ── */}
          <p className="stats-section-label">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            Ingresos
          </p>
          <div className="kpi-grid">
            <KpiCard label="Total Ventas"    value={fmt(resumen?.total_ventas)} variacion={resumen?.comparacion?.variacion_pct} />
            <KpiCard label="IVA Cobrado"     value={fmt(resumen?.total_iva)}    sub={`${resumen?.num_facturas||0} facturas`} />
            <KpiCard label="Ticket Promedio" value={fmt(resumen?.promedio)}     sub={`POS: ${resumen?.por_tipo?.POS||0}  ·  FE: ${resumen?.por_tipo?.FE||0}`} />
            <KpiCard label="Base Gravable"   value={fmt(resumen?.total_subtotal)} sub="Sin IVA" />
          </div>

          {/* ── KPIs Gastos + Resultado ── */}
          <p className="stats-section-label">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{color:'var(--danger)'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Gastos y resultado
          </p>
          <div className="kpi-grid">
            <KpiCard label="Total Gastos"    value={fmt(gastos?.total_gastos)}  sub={`${gastos?.num_gastos||0} registros`}   valueColor="var(--danger)" />
            <KpiCard label="IVA Pagado"      value={fmt(gastos?.total_iva)}     sub="Descontable en declaración" />
            <KpiCard label="Utilidad Bruta"  value={fmt(utilidad_bruta)}        sub={`Margen: ${margen_pct}%`}               valueColor={utilidad_bruta>=0?'var(--success)':'var(--danger)'} />
            <KpiCard label="Gastos / Ventas" value={resumen?.total_ventas>0 ? `${((gastos?.total_gastos||0)/resumen.total_ventas*100).toFixed(1)}%`:'—'} sub="Porcentaje de egresos" />
          </div>

          {/* ── KPIs Caja + Cartera + Inventario ── */}
          <p className="stats-section-label">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{color:'var(--warning)'}}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
            Caja, cartera e inventarios
          </p>
          <div className="kpi-grid">
            <KpiCard
              label="Ventas en Caja Diaria"
              value={totalCajaStr}
              sub={cajaCierres.length > 0 ? `${cajaCierres.length} cierres en el período` : 'Sin cierres en el período'}
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
              valueColor={totalPorCobrar > 0 ? 'var(--warning)' : undefined}
            />
            <KpiCard
              label="Inventario (valor venta)"
              value={invResumen ? fmt(invResumen.valor_venta) : '—'}
              sub={invResumen ? `${invResumen.total_productos} productos · ${invResumen.bajo_stock} bajo stock` : 'Sin productos físicos'}
              valueColor={invResumen?.bajo_stock > 0 ? 'var(--warning)' : undefined}
            />
          </div>

          {/* ── Tendencia de Ventas ── */}
          <div className="chart-card">
            <h3 className="chart-title">Tendencia de Ventas</h3>
            {tendencia.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={tendencia}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR}/>
                  <XAxis dataKey="fecha" tick={{fontSize:11,fill:TICK_COLOR}} stroke={AXIS_COLOR}/>
                  <YAxis tick={{fontSize:11,fill:TICK_COLOR}} stroke={AXIS_COLOR} tickFormatter={fmtK}/>
                  <Tooltip formatter={v=>[fmt(v),'Ventas']} contentStyle={ttStyle} labelStyle={{color:'#0f172a',fontWeight:600}}/>
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
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR}/>
                  <XAxis dataKey="fecha" tick={{fontSize:11,fill:TICK_COLOR}} stroke={AXIS_COLOR}/>
                  <YAxis tick={{fontSize:11,fill:TICK_COLOR}} stroke={AXIS_COLOR} tickFormatter={fmtK}/>
                  <Tooltip formatter={(v,n)=>[fmt(v),n==='ingresos'?'Ingresos':n==='gastos'?'Gastos':'Utilidad']} contentStyle={ttStyle} labelStyle={{color:'#0f172a',fontWeight:600}}/>
                  <Line type="monotone" dataKey="ingresos" stroke="#2563eb"       strokeWidth={2}   dot={false} name="ingresos"/>
                  <Line type="monotone" dataKey="gastos"   stroke="var(--danger)" strokeWidth={2}   dot={false} strokeDasharray="4 2" name="gastos"/>
                  <Line type="monotone" dataKey="utilidad" stroke="var(--success)"strokeWidth={2}   dot={false} name="utilidad"/>
                </LineChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                <span className="chart-legend-item"><span className="chart-legend-dot" style={{background:'#2563eb'}}/> Ingresos</span>
                <span className="chart-legend-item"><span className="chart-legend-dot" style={{background:'var(--danger)'}}/> Gastos</span>
                <span className="chart-legend-item"><span className="chart-legend-dot" style={{background:'var(--success)'}}/> Utilidad</span>
              </div>
            </div>
          )}

          {/* ── Tops ── */}
          <div className="top-grid">
            <div className="chart-card">
              <h3 className="chart-title">Top Clientes por Ingresos</h3>
              {clientes.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={clientes.slice(0,7)} layout="vertical" margin={{left:8,right:8}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:10,fill:TICK_COLOR}} stroke={AXIS_COLOR} tickFormatter={fmtK}/>
                    <YAxis type="category" dataKey="nombre" tick={{fontSize:10,fill:TICK_COLOR}} stroke={AXIS_COLOR} width={110}/>
                    <Tooltip formatter={v=>[fmt(v),'Ventas']} contentStyle={ttStyle}/>
                    <Bar dataKey="total" fill="var(--sidebar)" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="chart-empty">Sin datos</div>}
            </div>
            <div className="chart-card">
              <h3 className="chart-title">Top Servicios / Productos por Ingresos</h3>
              {productos.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={productos.slice(0,7)} layout="vertical" margin={{left:8,right:8}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:10,fill:TICK_COLOR}} stroke={AXIS_COLOR} tickFormatter={fmtK}/>
                    <YAxis type="category" dataKey="nombre" tick={{fontSize:10,fill:TICK_COLOR}} stroke={AXIS_COLOR} width={110}/>
                    <Tooltip formatter={v=>[fmt(v),'Ingresos']} contentStyle={ttStyle}/>
                    <Bar dataKey="total" fill="#f97316" radius={[0,4,4,0]}/>
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

          {/* ── PyG — Estado de Pérdidas y Ganancias ── */}
          {pyg && (
            <>
              <p className="stats-section-label">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                Estado de Pérdidas y Ganancias · {desde} → {hasta}
              </p>
              <div className="pyg-card card">

                {/* Ingresos */}
                <div className="pyg-group">
                  <p className="pyg-group-title">+ INGRESOS OPERACIONALES</p>
                  <div className="pyg-row"><span>Ventas brutas (con IVA)</span><span>{fmt(pyg.ingresos.brutos)}</span></div>
                  <div className="pyg-row pyg-row--sub"><span>(-) IVA recaudado</span><span className="pyg-neg">-{fmt(pyg.ingresos.iva)}</span></div>
                  <div className="pyg-row pyg-row--total"><span>= Ingresos netos</span><span>{fmt(pyg.ingresos.netos)}</span></div>
                </div>

                {/* Egresos gastos */}
                <div className="pyg-group">
                  <p className="pyg-group-title">- GASTOS OPERACIONALES</p>
                  {Object.entries(pyg.gastos.por_categoria).sort(([,a],[,b])=>b-a).map(([cat, monto]) => (
                    <div key={cat} className="pyg-row pyg-row--sub">
                      <span>{CAT_LABELS[cat] || cat}</span>
                      <span className="pyg-neg">-{fmt(monto)}</span>
                    </div>
                  ))}
                  {pyg.gastos.total === 0 && <div className="pyg-row pyg-row--sub pyg-empty">Sin gastos registrados en el período</div>}
                </div>

                {/* Nómina */}
                {pyg.nomina.periodos > 0 && (
                  <div className="pyg-group">
                    <p className="pyg-group-title">- COSTO DE NÓMINA ({pyg.nomina.periodos} período{pyg.nomina.periodos !== 1 ? 's' : ''})</p>
                    <div className="pyg-row pyg-row--sub"><span>Salarios devengados</span><span className="pyg-neg">-{fmt(pyg.nomina.devengado)}</span></div>
                    <div className="pyg-row pyg-row--sub"><span>Aportes empleador (salud, pensión, ARL...)</span><span className="pyg-neg">-{fmt(pyg.nomina.aportes)}</span></div>
                    <div className="pyg-row pyg-row--total"><span>= Costo total nómina</span><span className="pyg-neg">-{fmt(pyg.nomina.costo_total)}</span></div>
                  </div>
                )}

                {/* Resultado */}
                <div className="pyg-group pyg-group--resultado">
                  <div className="pyg-row pyg-row--total">
                    <span>Total egresos</span>
                    <span className="pyg-neg">-{fmt(pyg.resultado.total_egresos)}</span>
                  </div>
                  <div className={`pyg-row pyg-row--utilidad ${pyg.resultado.utilidad_operacional >= 0 ? 'pyg-positivo' : 'pyg-negativo'}`}>
                    <span>Utilidad operacional</span>
                    <span>{pyg.resultado.utilidad_operacional >= 0 ? '' : '-'}{fmt(Math.abs(pyg.resultado.utilidad_operacional))}</span>
                  </div>
                  {pyg.resultado.impuesto_estimado > 0 && (
                    <div className="pyg-row pyg-row--sub">
                      <span>Impuesto renta estimado (35%)</span>
                      <span className="pyg-neg">-{fmt(pyg.resultado.impuesto_estimado)}</span>
                    </div>
                  )}
                  <div className={`pyg-row pyg-row--neta ${pyg.resultado.utilidad_neta >= 0 ? 'pyg-positivo' : 'pyg-negativo'}`}>
                    <span>= UTILIDAD / PÉRDIDA NETA</span>
                    <span>{pyg.resultado.utilidad_neta >= 0 ? '' : '-'}{fmt(Math.abs(pyg.resultado.utilidad_neta))}</span>
                  </div>
                  <div className="pyg-margen">
                    Margen neto: <strong>{pyg.resultado.margen_pct}%</strong>
                    {pyg.nomina.periodos === 0 && pyg.gastos.total === 0 && (
                      <span className="pyg-hint"> · Registra gastos o nómina para un resultado real</span>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ── Agente IA ── */}
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
