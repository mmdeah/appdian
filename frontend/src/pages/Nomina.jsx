import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { nominaApi } from '../api/client'
import PrecioInput from '../components/ui/PrecioInput'
import './Nomina.css'

const COP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const CONTRATOS  = { INDEFINIDO: 'Término indefinido', FIJO: 'Término fijo', OBRA_LABOR: 'Obra o labor', PRESTACION: 'Prestación de servicios' }
const RIESGOS    = { 1: 'I – Mínimo (0.522%)', 2: 'II – Bajo (1.044%)', 3: 'III – Medio (2.436%)', 4: 'IV – Alto (4.350%)', 5: 'V – Máximo (6.960%)' }
const ESTADO_COLOR = { BORRADOR: 'neutral', PROCESADA: 'warning', PAGADA: 'success' }

const EMPTY_EMP = { nombre: '', apellido: '', tipo_doc: 'CC', num_doc: '', cargo: '', salario_base: '', tipo_contrato: 'INDEFINIDO', riesgo_arl: 1, fecha_inicio: '' }

function periodoActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function periodoLabel(p) {
  if (!p) return ''
  const [y, m] = p.split('-')
  return new Date(y, m - 1, 1).toLocaleString('es-CO', { month: 'long', year: 'numeric' })
}

/* ── Modal empleado ── */
function ModalEmpleado({ emp, onSave, onClose }) {
  const [form, setForm] = useState(emp || EMPTY_EMP)
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (form.id) await nominaApi.actualizarEmpleado(form.id, form)
      else await nominaApi.crearEmpleado(form)
      onSave()
    } catch (err) { alert(err.response?.data?.error || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="nom-overlay" onClick={onClose}>
      <div className="nom-modal" onClick={e => e.stopPropagation()}>
        <div className="nom-modal-head">
          <h3>{form.id ? 'Editar empleado' : 'Nuevo empleado'}</h3>
          <button className="nom-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="nom-form">
          <div className="nom-form-row">
            <label>Nombre<input required value={form.nombre} onChange={e => f('nombre', e.target.value)} /></label>
            <label>Apellido<input required value={form.apellido} onChange={e => f('apellido', e.target.value)} /></label>
          </div>
          <div className="nom-form-row">
            <label>Tipo doc.
              <select value={form.tipo_doc} onChange={e => f('tipo_doc', e.target.value)}>
                {['CC','CE','PA','TI'].map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>Número doc.<input required value={form.num_doc} onChange={e => f('num_doc', e.target.value)} /></label>
          </div>
          <div className="nom-form-row">
            <label>Cargo<input required value={form.cargo} onChange={e => f('cargo', e.target.value)} /></label>
            <label>Salario base
              <PrecioInput required value={form.salario_base} onChange={e => f('salario_base', e.target.value)} />
            </label>
          </div>
          <div className="nom-form-row">
            <label>Tipo contrato
              <select value={form.tipo_contrato} onChange={e => f('tipo_contrato', e.target.value)}>
                {Object.entries(CONTRATOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>Riesgo ARL
              <select value={form.riesgo_arl} onChange={e => f('riesgo_arl', parseInt(e.target.value))}>
                {Object.entries(RIESGOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <div className="nom-form-row">
            <label>Fecha inicio<input required type="date" value={form.fecha_inicio} onChange={e => f('fecha_inicio', e.target.value)} /></label>
          </div>
          <div className="nom-modal-foot">
            <button type="button" className="nom-btn-sec" onClick={onClose}>Cancelar</button>
            <button type="submit" className="nom-btn-pri" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Página principal ── */
export default function Nomina() {
  const navigate = useNavigate()
  const [tab, setTab]             = useState('empleados')
  const [empleados, setEmpleados] = useState([])
  const [liquidaciones, setLiqs]  = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalEmp, setModalEmp]   = useState(null)
  const [periodo, setPeriodo]     = useState(periodoActual)
  const [liquidando, setLiquidando] = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const [e, l] = await Promise.all([nominaApi.listarEmpleados(), nominaApi.listarLiquidaciones()])
      setEmpleados(e.data)
      setLiqs(l.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  async function retirarEmpleado(id, nombre) {
    if (!confirm(`¿Retirar a ${nombre}? El empleado quedará inactivo.`)) return
    await nominaApi.desactivarEmpleado(id)
    cargar()
  }

  async function handleLiquidar() {
    setLiquidando(true)
    try {
      const { data } = await nominaApi.liquidar({ periodo })
      await cargar()
      navigate(`/nomina/liquidacion/${data.id}`)
    } catch (err) { alert(err.response?.data?.error || 'Error al liquidar') }
    finally { setLiquidando(false) }
  }

  // KPIs calculados
  const nominaMensual   = empleados.reduce((s, e) => s + (+e.salario_base || 0), 0)
  const aportesEmpresa  = Math.round(nominaMensual * 0.2965)

  return (
    <div className="nomina-page">

      {/* ── Header ── */}
      <div className="nom-header">
        <div>
          <h2 className="nom-titulo">Nómina</h2>
          <p className="nom-sub">Gestión de empleados y liquidación mensual</p>
        </div>
        {tab === 'empleados' && (
          <button className="nom-btn-pri" onClick={() => setModalEmp('nuevo')}>+ Nuevo empleado</button>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="nom-kpis">
        <div className="nom-kpi">
          <p className="nom-kpi-label">Empleados activos</p>
          <p className="nom-kpi-val">{empleados.length}</p>
          <p className="nom-kpi-sub">Contratados</p>
        </div>
        <div className="nom-kpi">
          <p className="nom-kpi-label">Nómina mensual</p>
          <p className="nom-kpi-val">{COP(nominaMensual)}</p>
          <p className="nom-kpi-sub">Total devengado</p>
        </div>
        <div className="nom-kpi nom-kpi--accent">
          <p className="nom-kpi-label">Aportes empresa</p>
          <p className="nom-kpi-val nom-kpi-val--accent">{COP(aportesEmpresa)}</p>
          <p className="nom-kpi-sub">Seguridad social + parafiscales</p>
        </div>
        <div className="nom-kpi nom-kpi--dark">
          <p className="nom-kpi-label">Próxima liquidación</p>
          <p className="nom-kpi-val">{periodoLabel(periodoActual())}</p>
          <p className="nom-kpi-sub">Pendiente</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="nom-tabs">
        <button className={`nom-tab ${tab === 'empleados' ? 'nom-tab--active' : ''}`} onClick={() => setTab('empleados')}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          Empleados ({empleados.length})
        </button>
        <button className={`nom-tab ${tab === 'liquidaciones' ? 'nom-tab--active' : ''}`} onClick={() => setTab('liquidaciones')}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4"/></svg>
          Liquidaciones ({liquidaciones.length})
        </button>
      </div>

      {loading ? (
        <div className="nom-loading"><div className="spinner" /></div>
      ) : tab === 'empleados' ? (

        /* ── EMPLEADOS ── */
        empleados.length === 0 ? (
          <div className="nom-empty">
            <div className="nom-empty-icon">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg>
            </div>
            <p className="nom-empty-title">No hay empleados registrados</p>
            <p className="nom-empty-sub">Agrega tu primer empleado para empezar a gestionar la nómina.</p>
            <button className="nom-btn-pri" onClick={() => setModalEmp('nuevo')}>+ Agregar primer empleado</button>
          </div>
        ) : (
          <div className="nom-tabla">
            <div className="nom-tabla-head">
              <span>Empleado</span><span>Cargo</span><span>Salario</span><span>Contrato</span><span>ARL</span><span></span>
            </div>
            {empleados.map(e => (
              <div key={e.id} className="nom-row">
                <div className="nom-emp-col">
                  <span className="nom-emp-nombre">{e.nombre} {e.apellido}</span>
                  <span className="nom-emp-doc">{e.tipo_doc} {e.num_doc}</span>
                </div>
                <span className="nom-cell-sec">{e.cargo}</span>
                <span className="nom-cell-bold">{COP(e.salario_base)}</span>
                <span className="nom-cell-sec">{CONTRATOS[e.tipo_contrato]}</span>
                <span className="nom-cell-pill">Clase {e.riesgo_arl}</span>
                <div className="nom-acciones">
                  <button className="nom-action-btn nom-action-btn--edit" onClick={() => setModalEmp(e)} title="Editar">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="nom-action-btn nom-action-btn--del" onClick={() => retirarEmpleado(e.id, `${e.nombre} ${e.apellido}`)} title="Retirar">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )

      ) : (

        /* ── LIQUIDACIONES ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          {/* Panel liquidar */}
          <div className="nom-liq-panel">
            <div>
              <p className="nom-liq-titulo">Calcular nómina del período</p>
              <p className="nom-liq-sub">Se liquidan todos los empleados activos ({empleados.length}).</p>
            </div>
            <div className="nom-liq-panel-right">
              <input
                type="month"
                className="nom-input-mes"
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
              />
              <button className="nom-btn-dark" onClick={handleLiquidar} disabled={liquidando || !empleados.length}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                {liquidando ? 'Calculando...' : 'Liquidar nómina'}
              </button>
            </div>
          </div>

          {/* Historial */}
          {liquidaciones.length === 0 ? (
            <div className="nom-empty">
              <p className="nom-empty-title">No hay liquidaciones aún</p>
              <p className="nom-empty-sub">Calcula la primera nómina arriba.</p>
            </div>
          ) : (
            <div className="nom-tabla">
              <div className="nom-liq-head">
                <span>Período</span><span>Empleados</span><span>Devengado</span><span>Deducciones</span><span>Neto a pagar</span><span>Estado</span><span></span>
              </div>
              {liquidaciones.map(l => (
                <div key={l.id} className="nom-liq-row" onClick={() => navigate(`/nomina/liquidacion/${l.id}`)}>
                  <span className="nom-cell-bold">{periodoLabel(l.periodo)}</span>
                  <span className="nom-cell-sec">{l.num_empleados} emp.</span>
                  <span>{COP(l.total_devengado)}</span>
                  <span className="nom-danger">-{COP(l.total_deducciones)}</span>
                  <span className="nom-cell-bold">{COP(l.total_neto)}</span>
                  <span><span className={`nom-estado nom-estado--${ESTADO_COLOR[l.estado]}`}>{l.estado}</span></span>
                  <span className="nom-ver">Ver →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalEmp && (
        <ModalEmpleado
          emp={modalEmp === 'nuevo' ? null : modalEmp}
          onSave={() => { setModalEmp(null); cargar() }}
          onClose={() => setModalEmp(null)}
        />
      )}
    </div>
  )
}
