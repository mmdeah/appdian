import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { nominaApi } from '../api/client'
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{form.id ? 'Editar empleado' : 'Nuevo empleado'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="emp-form">
          <div className="form-row">
            <label>Nombre<input required value={form.nombre} onChange={e => f('nombre', e.target.value)} /></label>
            <label>Apellido<input required value={form.apellido} onChange={e => f('apellido', e.target.value)} /></label>
          </div>
          <div className="form-row">
            <label>Tipo doc.
              <select value={form.tipo_doc} onChange={e => f('tipo_doc', e.target.value)}>
                {['CC','CE','PA','TI'].map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label>Número doc.<input required value={form.num_doc} onChange={e => f('num_doc', e.target.value)} /></label>
          </div>
          <div className="form-row">
            <label>Cargo<input required value={form.cargo} onChange={e => f('cargo', e.target.value)} /></label>
            <label>Salario base
              <input required type="number" min="0" value={form.salario_base} onChange={e => f('salario_base', e.target.value)} />
            </label>
          </div>
          <div className="form-row">
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
          <div className="form-row">
            <label>Fecha inicio<input required type="date" value={form.fecha_inicio} onChange={e => f('fecha_inicio', e.target.value)} /></label>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn-sec" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-pri" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
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
  const [modalEmp, setModalEmp]   = useState(null)   // null | 'nuevo' | {emp}
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

  return (
    <div className="nomina-page">
      <div className="nom-header">
        <div>
          <h2 className="nom-titulo">Nómina</h2>
          <p className="nom-subtitulo muted">Gestión de empleados y liquidación mensual</p>
        </div>
        {tab === 'empleados' && (
          <button className="btn-pri" onClick={() => setModalEmp('nuevo')}>+ Nuevo empleado</button>
        )}
      </div>

      {/* Tabs */}
      <div className="nom-tabs">
        <button className={`nom-tab ${tab === 'empleados' ? 'nom-tab--active' : ''}`} onClick={() => setTab('empleados')}>
          👥 Empleados ({empleados.length})
        </button>
        <button className={`nom-tab ${tab === 'liquidaciones' ? 'nom-tab--active' : ''}`} onClick={() => setTab('liquidaciones')}>
          📋 Liquidaciones ({liquidaciones.length})
        </button>
      </div>

      {loading ? (
        <div className="nom-loading"><div className="spinner" /></div>
      ) : tab === 'empleados' ? (

        /* ── EMPLEADOS ── */
        empleados.length === 0 ? (
          <div className="nom-empty">
            <p>No hay empleados registrados.</p>
            <button className="btn-pri" onClick={() => setModalEmp('nuevo')}>Agregar primer empleado</button>
          </div>
        ) : (
          <div className="emp-tabla">
            <div className="emp-tabla-head">
              <span>Empleado</span><span>Cargo</span><span>Salario</span><span>Contrato</span><span>ARL</span><span></span>
            </div>
            {empleados.map(e => (
              <div key={e.id} className="emp-row">
                <div className="emp-nombre-col">
                  <span className="emp-nombre">{e.nombre} {e.apellido}</span>
                  <span className="emp-doc muted">{e.tipo_doc} {e.num_doc}</span>
                </div>
                <span className="emp-cargo">{e.cargo}</span>
                <span className="emp-salario">{COP(e.salario_base)}</span>
                <span className="emp-contrato">{CONTRATOS[e.tipo_contrato]}</span>
                <span className="emp-arl">Clase {e.riesgo_arl}</span>
                <div className="emp-acciones">
                  <button className="btn-icon" onClick={() => setModalEmp(e)} title="Editar">✏️</button>
                  <button className="btn-icon btn-icon--danger" onClick={() => retirarEmpleado(e.id, `${e.nombre} ${e.apellido}`)} title="Retirar">🚫</button>
                </div>
              </div>
            ))}
          </div>
        )

      ) : (

        /* ── LIQUIDACIONES ── */
        <div>
          {/* Panel de liquidar */}
          <div className="liq-panel">
            <div className="liq-panel-left">
              <p className="liq-panel-titulo">Calcular nómina del período</p>
              <p className="muted t-sm">Se liquidan todos los empleados activos ({empleados.length})</p>
            </div>
            <div className="liq-panel-right">
              <input
                type="month" className="input-mes" value={periodo}
                onChange={e => setPeriodo(e.target.value)}
              />
              <button className="btn-pri" onClick={handleLiquidar} disabled={liquidando || !empleados.length}>
                {liquidando ? 'Calculando...' : '⚡ Liquidar nómina'}
              </button>
            </div>
          </div>

          {/* Historial */}
          {liquidaciones.length === 0 ? (
            <div className="nom-empty"><p>No hay liquidaciones aún. Calcula la primera nómina arriba.</p></div>
          ) : (
            <div className="liq-tabla">
              <div className="liq-tabla-head">
                <span>Período</span><span>Empleados</span><span>Devengado</span><span>Deducciones</span><span>Neto a pagar</span><span>Estado</span><span></span>
              </div>
              {liquidaciones.map(l => (
                <div key={l.id} className="liq-row" onClick={() => navigate(`/nomina/liquidacion/${l.id}`)}>
                  <span className="liq-periodo">{periodoLabel(l.periodo)}</span>
                  <span>{l.num_empleados} emp.</span>
                  <span>{COP(l.total_devengado)}</span>
                  <span className="color-danger">-{COP(l.total_deducciones)}</span>
                  <span className="font-bold">{COP(l.total_neto)}</span>
                  <span><span className={`estado-chip estado-chip--${ESTADO_COLOR[l.estado]}`}>{l.estado}</span></span>
                  <span className="liq-ver">Ver →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal empleado */}
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
