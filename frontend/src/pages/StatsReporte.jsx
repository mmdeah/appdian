import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { statsApi, gastosApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import './StatsReporte.css'

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)
const PCT = n => `${parseFloat(n || 0).toFixed(1)}%`

function periodoLabel(desde, hasta) {
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  return `${fmt(desde)} — ${fmt(hasta)}`
}

// Renderer de markdown simplificado para el reporte IA
function renderInline(str) {
  const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2,-2)}</strong>
    if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i}>{p.slice(1,-1)}</em>
    return p
  })
}

function MdBlock({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const out = []; let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i++; continue }
    if (line.startsWith('# '))    { out.push(<h1 key={i} className="rep-h1">{renderInline(line.slice(2))}</h1>); i++ }
    else if (line.startsWith('## '))  { out.push(<h2 key={i} className="rep-h2">{renderInline(line.slice(3))}</h2>); i++ }
    else if (line.startsWith('### ')) { out.push(<h3 key={i} className="rep-h3">{renderInline(line.slice(4))}</h3>); i++ }
    else if (/^[-*_]{3,}$/.test(line)) { out.push(<hr key={i} className="rep-hr" />); i++ }
    else if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim()); i++ }
      const valid = rows.filter(r => !/^\|[\s|:-]+\|$/.test(r))
      if (valid.length) {
        const parse = r => r.split('|').slice(1,-1).map(c => c.trim())
        const [head, ...body] = valid
        out.push(
          <table key={`t${i}`} className="rep-table">
            <thead><tr>{parse(head).map((c,j) => <th key={j}>{renderInline(c)}</th>)}</tr></thead>
            <tbody>{body.map((row,ri) => <tr key={ri}>{parse(row).map((c,ci) => <td key={ci}>{renderInline(c)}</td>)}</tr>)}</tbody>
          </table>
        )
      }
    } else if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s/, '')); i++ }
      out.push(<ol key={`ol${i}`} className="rep-ol">{items.map((it,j) => <li key={j}>{renderInline(it)}</li>)}</ol>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = []
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) { items.push(lines[i].trim().slice(2)); i++ }
      out.push(<ul key={`ul${i}`} className="rep-ul">{items.map((it,j) => <li key={j}>{renderInline(it)}</li>)}</ul>)
    } else if (line.startsWith('> ')) {
      out.push(<blockquote key={i} className="rep-quote">{renderInline(line.slice(2))}</blockquote>); i++
    } else {
      out.push(<p key={i} className="rep-p">{renderInline(line)}</p>); i++
    }
  }
  return <>{out}</>
}

export default function StatsReporte() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { empresa } = useAuth()

  // Los datos vienen del navigate state O los volvemos a cargar
  const state = location.state || {}
  const [datos,     setDatos]     = useState(state)
  const [modo,      setModo]      = useState(null)   // null | 'simple' | 'ia'
  const [reporteIA, setReporteIA] = useState(null)
  const [cargandoIA, setCargandoIA] = useState(false)
  const [errorIA,   setErrorIA]   = useState(null)
  const [cargando,  setCargando]  = useState(!state.resumen)

  // Si no hay datos del state, los volvemos a cargar
  useEffect(() => {
    if (state.resumen) return
    const desde = new Date(); desde.setDate(desde.getDate() - 30)
    const desdeStr = desde.toISOString().split('T')[0]
    const hastaStr = new Date().toISOString().split('T')[0]

    Promise.all([
      statsApi.resumen({ desde: desdeStr, hasta: hastaStr }),
      statsApi.tendencia({ desde: desdeStr, hasta: hastaStr, agrupacion: 'mes' }),
      statsApi.topClientes({ desde: desdeStr, hasta: hastaStr }),
      statsApi.topProductos({ desde: desdeStr, hasta: hastaStr }),
      gastosApi.resumen({ desde: desdeStr, hasta: hastaStr }),
      gastosApi.flujo({ desde: desdeStr, hasta: hastaStr, agrupacion: 'mes' }),
    ]).then(([r,t,c,p,g]) => {
      setDatos({
        periodo: { desde: desdeStr, hasta: hastaStr },
        resumen: r.data, tendencia: t.data, clientes: c.data, productos: p.data, gastos: g.data,
      })
    }).finally(() => setCargando(false))
  }, [])

  async function generarReporteIA() {
    setCargandoIA(true)
    setReporteIA(null)
    setErrorIA(null)
    try {
      const { data } = await statsApi.reporteIA({
        periodo: datos.periodo,
        resumen:   datos.resumen,
        gastos:    datos.gastos,
        tendencia: datos.tendencia,
        clientes:  datos.clientes,
        productos: datos.productos,
      })
      setReporteIA(data.reporte)
      setModo('ia')
    } catch (e) {
      setErrorIA(e.response?.data?.error || 'Error al generar el reporte. Verifica OPENROUTER_API_KEY.')
    } finally { setCargandoIA(false) }
  }

  function imprimir() { window.print() }

  const { resumen: r, gastos: g, clientes, productos, periodo } = datos
  const utilidad = (r?.total_ventas || 0) - (g?.total_gastos || 0)
  const margen   = r?.total_ventas > 0 ? ((utilidad / r.total_ventas) * 100).toFixed(1) : 0

  if (cargando) return (
    <div className="rep-loading">
      <div className="spinner" />
      <p>Cargando datos…</p>
    </div>
  )

  return (
    <div className="reporte-page">
      {/* ── Acciones (solo pantalla) ── */}
      <div className="rep-acciones no-print">
        <button className="rep-btn-back" onClick={() => navigate('/estadisticas')}>← Volver a estadísticas</button>
        {modo && (
          <button className="rep-btn-print" onClick={imprimir}>🖨️ Imprimir / PDF</button>
        )}
      </div>

      {errorIA && (
        <div className="rep-error no-print">⚠️ {errorIA}</div>
      )}

      {!modo && (
        <div className="rep-placeholder no-print">
          <div className="rep-placeholder-inner">
            <p style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>📄</p>
            <h3>Genera tu reporte financiero</h3>
            <p>Selecciona el tipo de reporte que deseas generar.</p>
            <div className="rep-selector-btns">
              <button className="rep-selector-btn" onClick={() => setModo('simple')}>
                <span className="rep-selector-icon">📋</span>
                <span className="rep-selector-label">Reporte sencillo</span>
                <small>Tablas con los datos actuales</small>
              </button>
              <button className="rep-selector-btn rep-selector-btn--ia" onClick={generarReporteIA} disabled={cargandoIA}>
                <span className="rep-selector-icon">{cargandoIA ? '⏳' : '🤖'}</span>
                <span className="rep-selector-label">{cargandoIA ? 'Generando…' : 'Análisis con IA'}</span>
                <small>Reporte narrativo generado por IA</small>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
           REPORTE — se imprime desde aquí hacia abajo
      ══════════════════════════════════════════════════ */}
      {modo && (
        <div className="reporte-doc">
          {/* Encabezado */}
          <div className="rep-encabezado">
            <div>
              <h1 className="rep-empresa">{empresa?.nombre || 'Mi Empresa'}</h1>
              <p className="rep-nit">NIT: {empresa?.nit}</p>
            </div>
            <div className="rep-titulo-box">
              <h2 className="rep-titulo-main">
                {modo === 'ia' ? 'REPORTE FINANCIERO' : 'INFORME DE GESTIÓN'}
              </h2>
              <p className="rep-periodo">{periodo ? periodoLabel(periodo.desde, periodo.hasta) : ''}</p>
              <p className="rep-generado">Generado por Konta · {new Date().toLocaleDateString('es-CO')}</p>
            </div>
          </div>

          <hr className="rep-hr" />

          {modo === 'simple' ? (
            /* ── REPORTE SENCILLO ── */
            <>
              {/* Tabla resumen financiero */}
              <h3 className="rep-h3">Resumen Financiero</h3>
              <table className="rep-table rep-table--full">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th style={{ textAlign: 'right' }}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="rep-row-ingreso">
                    <td><strong>Ingresos totales</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{COP(r?.total_ventas)}</strong></td>
                    <td style={{ textAlign: 'right' }}>{r?.num_facturas || 0} facturas</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '1.5rem' }}>IVA cobrado</td>
                    <td style={{ textAlign: 'right' }}>{COP(r?.total_iva)}</td>
                    <td style={{ textAlign: 'right' }}>Incluido en total</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '1.5rem' }}>Base gravable (sin IVA)</td>
                    <td style={{ textAlign: 'right' }}>{COP(r?.total_subtotal)}</td>
                    <td style={{ textAlign: 'right' }}>Ticket prom: {COP(r?.promedio)}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '1.5rem' }}>Documentos POS</td>
                    <td style={{ textAlign: 'right' }}>{r?.por_tipo?.POS || 0} docs</td>
                    <td style={{ textAlign: 'right' }}>Facturas FE: {r?.por_tipo?.FE || 0}</td>
                  </tr>
                  <tr className="rep-row-gasto">
                    <td><strong>Gastos totales</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{COP(g?.total_gastos)}</strong></td>
                    <td style={{ textAlign: 'right' }}>{g?.num_gastos || 0} registros</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: '1.5rem' }}>IVA pagado</td>
                    <td style={{ textAlign: 'right' }}>{COP(g?.total_iva)}</td>
                    <td style={{ textAlign: 'right' }}>Descontable</td>
                  </tr>
                  <tr className={`rep-row-util ${utilidad < 0 ? 'rep-row-negativo' : ''}`}>
                    <td><strong>Utilidad bruta</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{COP(utilidad)}</strong></td>
                    <td style={{ textAlign: 'right' }}>Margen: {PCT(margen)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Gastos por categoría */}
              {g?.categorias?.length > 0 && (
                <>
                  <h3 className="rep-h3">Gastos por Categoría</h3>
                  <table className="rep-table rep-table--full">
                    <thead>
                      <tr>
                        <th>Categoría</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'right' }}>% del total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.categorias.map(c => (
                        <tr key={c.nombre}>
                          <td>{c.nombre.replace(/_/g, ' ')}</td>
                          <td style={{ textAlign: 'right' }}>{COP(c.total)}</td>
                          <td style={{ textAlign: 'right' }}>
                            {g.total_gastos > 0 ? PCT((c.total / g.total_gastos) * 100) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* Top clientes */}
              {clientes?.length > 0 && (
                <>
                  <h3 className="rep-h3">Top Clientes por Ingresos</h3>
                  <table className="rep-table rep-table--full">
                    <thead><tr><th>#</th><th>Cliente</th><th style={{ textAlign: 'right' }}>Total ventas</th></tr></thead>
                    <tbody>
                      {clientes.slice(0, 10).map((c, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{c.nombre}</td>
                          <td style={{ textAlign: 'right' }}>{COP(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* Top productos */}
              {productos?.length > 0 && (
                <>
                  <h3 className="rep-h3">Top Productos por Ingresos</h3>
                  <table className="rep-table rep-table--full">
                    <thead><tr><th>#</th><th>Producto</th><th style={{ textAlign: 'right' }}>Ingresos</th><th style={{ textAlign: 'right' }}>Unidades</th></tr></thead>
                    <tbody>
                      {productos.slice(0, 10).map((p, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{p.nombre}</td>
                          <td style={{ textAlign: 'right' }}>{COP(p.total)}</td>
                          <td style={{ textAlign: 'right' }}>{p.cantidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <blockquote className="rep-disclaimer">
                Este informe fue generado automáticamente por Konta. Para efectos fiscales, consulte con su contador.
              </blockquote>
            </>
          ) : (
            /* ── REPORTE IA ── */
            reporteIA ? (
              <div className="rep-ia-body">
                <MdBlock text={reporteIA} />
              </div>
            ) : (
              <div className="rep-loading no-print">
                <div className="spinner" />
                <p>Generando análisis con IA…</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
