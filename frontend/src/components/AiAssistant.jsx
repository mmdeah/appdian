/**
 * AiAssistant — componente compartido de agente IA
 * Usado en: Dashboard, Estadísticas
 *
 * Props:
 *   contexto     — objeto con datos financieros para el modo "datos"
 *   sugerenciasD — chips del modo datos   (opcional, tiene defaults)
 *   sugerenciasG — chips del modo general (opcional, tiene defaults)
 */
import { useState } from 'react'
import { statsApi } from '../api/client'
import './AiAssistant.css'

// ── Defaults de sugerencias ──────────────────────────────────────────────────
const DEFAULT_DATOS = [
  { emoji:'📈', texto:'¿Cómo están mis ventas vs el período anterior?' },
  { emoji:'💰', texto:'¿Cuál es mi utilidad neta después de gastos?' },
  { emoji:'⚠️', texto:'¿Hay facturas por cobrar que deba seguir?' },
  { emoji:'🧾', texto:'¿Cuánto IVA debo declarar en este período?' },
]

const DEFAULT_GENERAL = [
  { emoji:'🏛️', texto:'¿Qué obligaciones tributarias tengo como persona jurídica?' },
  { emoji:'📋', texto:'¿Cómo funciona la retención en la fuente en Colombia?' },
  { emoji:'💼', texto:'¿Cuál es la diferencia entre IVA e INC?' },
  { emoji:'👥', texto:'¿Qué prestaciones sociales debo pagar a mis empleados?' },
]

// ── Markdown renderer ────────────────────────────────────────────────────────
function renderInline(str) {
  return str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2,-2)}</strong>
    if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i}>{p.slice(1,-1)}</em>
    if (p.startsWith('`')  && p.endsWith('`'))  return <code key={i} className="ai-md-code">{p.slice(1,-1)}</code>
    return p
  })
}

export function MarkdownRenderer({ text }) {
  const lines = text.split('\n')
  const out = []; let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i++; continue }
    if (line.startsWith('### '))      { out.push(<h3 key={i} className="ai-md-h3">{renderInline(line.slice(4))}</h3>); i++ }
    else if (line.startsWith('## ')) { out.push(<h2 key={i} className="ai-md-h2">{renderInline(line.slice(3))}</h2>); i++ }
    else if (line.startsWith('# '))  { out.push(<h1 key={i} className="ai-md-h1">{renderInline(line.slice(2))}</h1>); i++ }
    else if (/^[-*_]{3,}$/.test(line)) { out.push(<hr key={i} className="ai-md-hr"/>); i++ }
    else if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim()); i++ }
      const data = rows.filter(r => !/^\|[\s|:-]+\|$/.test(r))
      if (data.length > 0) {
        const parse = r => r.split('|').slice(1,-1).map(c => c.trim())
        const [head,...body] = data
        out.push(
          <div key={`t${i}`} className="ai-md-table-wrap">
            <table className="ai-md-table">
              <thead><tr>{parse(head).map((c,j) => <th key={j}>{renderInline(c)}</th>)}</tr></thead>
              <tbody>{body.map((row,ri) => <tr key={ri}>{parse(row).map((c,ci) => <td key={ci}>{renderInline(c)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )
      }
    } else if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s/, '')); i++ }
      out.push(<ol key={`ol${i}`} className="ai-md-ol">{items.map((it,j) => <li key={j}>{renderInline(it)}</li>)}</ol>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = []
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) { items.push(lines[i].trim().slice(2)); i++ }
      out.push(<ul key={`ul${i}`} className="ai-md-ul">{items.map((it,j) => <li key={j}>{renderInline(it)}</li>)}</ul>)
    } else if (line.startsWith('> ')) {
      out.push(<blockquote key={i} className="ai-md-blockquote">{renderInline(line.slice(2))}</blockquote>); i++
    } else {
      out.push(<p key={i} className="ai-md-p">{renderInline(line)}</p>); i++
    }
  }
  return <>{out}</>
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function AiAssistant({
  contexto     = {},
  sugerenciasD = DEFAULT_DATOS,
  sugerenciasG = DEFAULT_GENERAL,
}) {
  const [tab,    setTab]    = useState('datos')
  const [texto,  setTexto]  = useState('')

  const [analizandoD, setAnalizandoD] = useState(false)
  const [respD,       setRespD]       = useState(null)
  const [errD,        setErrD]        = useState(null)

  const [analizandoG, setAnalizandoG] = useState(false)
  const [respG,       setRespG]       = useState(null)
  const [errG,        setErrG]        = useState(null)

  const esDatos    = tab === 'datos'
  const analizando = esDatos ? analizandoD : analizandoG

  async function enviar(preg) {
    const q = (preg || texto).trim()
    if (!q || analizando) return
    setTexto('')

    if (esDatos) {
      setAnalizandoD(true); setRespD(null); setErrD(null)
      try {
        const { data } = await statsApi.ai({ pregunta: q, contexto })
        setRespD(data.respuesta)
      } catch (e) {
        setErrD(e.response?.data?.error || 'Error al consultar. Verifica OPENROUTER_API_KEY en Railway.')
      } finally { setAnalizandoD(false) }
    } else {
      setAnalizandoG(true); setRespG(null); setErrG(null)
      try {
        const { data } = await statsApi.chatGeneral({ pregunta: q })
        setRespG(data.respuesta)
      } catch (e) {
        setErrG(e.response?.data?.error || 'Error al consultar el asistente.')
      } finally { setAnalizandoG(false) }
    }
  }

  const sugerencias = esDatos ? sugerenciasD : sugerenciasG
  const resp        = esDatos ? respD        : respG
  const err         = esDatos ? errD         : errG

  return (
    <div className="aia-shell">

      {/* Tabs */}
      <div className="aia-tabs">
        <button
          className={`aia-tab ${tab==='datos' ? 'aia-tab--datos-on' : ''}`}
          onClick={() => setTab('datos')}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          Analista de tus datos
        </button>
        <button
          className={`aia-tab aia-tab--gen ${tab==='general' ? 'aia-tab--gen-on' : ''}`}
          onClick={() => setTab('general')}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          Consultor general
        </button>
      </div>

      {/* Hero header */}
      {esDatos ? (
        <div className="aia-hero aia-hero--datos">
          <div className="aia-hero-glow"/>
          <div className="aia-hero-row">
            <div className="aia-avatar aia-avatar--datos">
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                <circle cx="8.5" cy="14.5" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <div className="aia-hero-text">
              <h3 className="aia-hero-title">Analista Contable IA</h3>
              <p className="aia-hero-sub">
                <span className="aia-badge aia-badge--datos">🔒 Accede a tus datos reales</span>
                — ventas, gastos, caja, inventario y cartera
              </p>
            </div>
            <div className="aia-model-pill aia-model-pill--datos">
              <span className="aia-model-dot aia-model-dot--datos"/>
              Nvidia Nemotron 550B
            </div>
          </div>
        </div>
      ) : (
        <div className="aia-hero aia-hero--general">
          <div className="aia-hero-row">
            <div className="aia-avatar aia-avatar--general">
              <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div className="aia-hero-text">
              <h3 className="aia-hero-title aia-hero-title--general">Consultor Contable General</h3>
              <p className="aia-hero-sub">
                <span className="aia-badge aia-badge--general">📚 Sin acceso a tus datos</span>
                — normativa, tributación, DIAN, NIIF, nómina
              </p>
            </div>
            <div className="aia-model-pill aia-model-pill--general">
              <span className="aia-model-dot aia-model-dot--general"/>
              Nvidia Nemotron 550B
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className={`aia-body ${esDatos ? '' : 'aia-body--general'}`}>

        {/* Sugerencias */}
        <p className="aia-section-label">Preguntas frecuentes</p>
        <div className="aia-chips">
          {sugerencias.map(s => (
            <button
              key={s.texto}
              className={`aia-chip ${esDatos ? 'aia-chip--datos' : 'aia-chip--general'}`}
              onClick={() => enviar(s.texto)}
              disabled={analizando}
            >
              <span>{s.emoji}</span>{s.texto}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className={`aia-input-wrap ${esDatos ? '' : 'aia-input-wrap--general'}`}>
          <textarea
            className="aia-input"
            placeholder={esDatos
              ? 'Consulta sobre tus datos financieros del período…'
              : 'Pregunta sobre contabilidad, IVA, DIAN, nómina, NIIF…'}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={3}
            onKeyDown={e => { if (e.key==='Enter' && (e.ctrlKey||e.metaKey)) enviar() }}
          />
          <div className="aia-input-footer">
            <span className="aia-hint">Ctrl+Enter para enviar</span>
            <button
              className={`aia-send ${esDatos ? 'aia-send--datos' : 'aia-send--general'}`}
              onClick={() => enviar()}
              disabled={analizando || !texto.trim()}
            >
              {analizando
                ? <><span className="aia-spinner"/> Analizando…</>
                : <>Enviar <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{marginLeft:6}}><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
              }
            </button>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="aia-error">
            ⚠️ {err}
            <button className="aia-retry" onClick={() => enviar(texto)}>Reintentar</button>
          </div>
        )}

        {/* Respuesta */}
        {resp && (
          <div className={`aia-resp-card ${esDatos ? 'aia-resp-card--datos' : 'aia-resp-card--general'}`}>
            <div className="aia-resp-head">
              <div className="aia-resp-badge">
                <span className={`aia-resp-dot ${esDatos ? 'aia-resp-dot--datos' : 'aia-resp-dot--general'}`}/>
                {esDatos ? 'Análisis de tus datos' : 'Respuesta del consultor'}
              </div>
            </div>
            <div className="aia-resp-body">
              <MarkdownRenderer text={resp}/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
