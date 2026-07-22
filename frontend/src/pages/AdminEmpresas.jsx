import { useState, useEffect } from 'react'
import { profesionalApi } from '../api/client'
import './AdminEmpresas.css'

const PLANES = ['basico', 'dian']
const PLAN_COLOR = { basico: '#64748b', dian: '#6366f1' }
const PLAN_LABEL = { basico: 'Básico — sin DIAN', dian: 'DIAN — Facturación electrónica' }

const fmt = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

function diasRestantes(fechaStr) {
  if (!fechaStr) return null
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const vence = new Date(fechaStr + 'T12:00:00')
  return Math.ceil((vence - hoy) / 86400000)
}

function DiasBadge({ dias }) {
  if (dias === null) return <span className="ae-dias ae-dias--none">Sin fecha</span>
  if (dias < 0)  return <span className="ae-dias ae-dias--red">Vencido ({Math.abs(dias)}d)</span>
  if (dias <= 7) return <span className="ae-dias ae-dias--red">{dias}d</span>
  if (dias <= 30) return <span className="ae-dias ae-dias--yellow">{dias}d</span>
  return <span className="ae-dias ae-dias--green">{dias}d</span>
}

/* ── Panel lateral de detalle ─────────────────────────────── */
function DetallePanel({ empresa, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    plan:         empresa.plan || 'esencial',
    plan_pagado:  empresa.plan_pagado || false,
    plan_vence_en: empresa.plan_vence_en || '',
    activo:       empresa.activo !== false,
    plan_notas:   empresa.plan_notas || '',
  })

  function campo(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function guardar() { onSave(form) }

  return (
    <div className="ae-detalle">
      <div className="ae-detalle-header">
        <div>
          <h3 className="ae-detalle-nombre">{empresa.nombre}</h3>
          <p className="ae-detalle-sub">NIT {empresa.nit} · {empresa.email}</p>
        </div>
        <button className="ae-detalle-close" onClick={onClose}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="ae-detalle-body">
        {/* Plan */}
        <div className="ae-field">
          <label className="ae-field-label">Plan</label>
          <select className="ae-select" value={form.plan} onChange={e => campo('plan', e.target.value)}>
            {PLANES.map(p => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
          </select>
        </div>

        {/* Fecha vencimiento */}
        <div className="ae-field">
          <label className="ae-field-label">Vencimiento del plan</label>
          <input
            type="date"
            className="ae-input"
            value={form.plan_vence_en}
            onChange={e => campo('plan_vence_en', e.target.value)}
          />
          {form.plan_vence_en && (
            <span className="ae-field-hint">
              <DiasBadge dias={diasRestantes(form.plan_vence_en)} /> restantes
            </span>
          )}
        </div>

        {/* Toggles */}
        <div className="ae-toggles">
          <label className="ae-toggle-row" onClick={() => campo('plan_pagado', !form.plan_pagado)}>
            <div className={`ae-switch ${form.plan_pagado ? 'ae-switch--on' : ''}`}>
              <div className="ae-switch-thumb" />
            </div>
            <span>
              <strong>{form.plan_pagado ? 'Pagado ✓' : 'Pendiente de pago'}</strong>
              <small>Mes actual pagado</small>
            </span>
          </label>

          <label className="ae-toggle-row" onClick={() => campo('activo', !form.activo)}>
            <div className={`ae-switch ${form.activo ? 'ae-switch--on' : ''}`}>
              <div className="ae-switch-thumb" />
            </div>
            <span>
              <strong>{form.activo ? 'Cuenta activa' : 'Cuenta inactiva'}</strong>
              <small>Acceso al sistema</small>
            </span>
          </label>
        </div>

        {/* Notas */}
        <div className="ae-field">
          <label className="ae-field-label">Notas internas</label>
          <textarea
            className="ae-textarea"
            placeholder="Ej: Pago mensual, próximo pago 01/08/2026…"
            value={form.plan_notas}
            onChange={e => campo('plan_notas', e.target.value)}
            rows={3}
          />
        </div>

        {/* Info */}
        <div className="ae-info-row">
          <span className="ae-info-label">Registrado</span>
          <span className="ae-info-val">{fmt(empresa.created_at?.split('T')[0])}</span>
        </div>
      </div>

      <div className="ae-detalle-footer">
        <button className="ae-btn-cancel" onClick={onClose}>Cancelar</button>
        <button className="ae-btn-save" onClick={guardar} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

/* ── Página principal ─────────────────────────────────────── */
export default function AdminEmpresas() {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const { data } = await profesionalApi.listarEmpresas()
      setEmpresas(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }

  async function toggleRapido(empresa, campo, val) {
    const body = { [campo]: val }
    try {
      await profesionalApi.actualizarEmpresa(empresa.id, body)
      setEmpresas(prev => prev.map(e => e.id === empresa.id ? { ...e, ...body } : e))
      if (selected?.id === empresa.id) setSelected(s => ({ ...s, ...body }))
    } catch {}
  }

  async function guardar(fields) {
    if (!selected) return
    setSaving(true)
    try {
      await profesionalApi.actualizarEmpresa(selected.id, fields)
      setEmpresas(prev => prev.map(e => e.id === selected.id ? { ...e, ...fields } : e))
      setSelected(s => ({ ...s, ...fields }))
    } finally { setSaving(false) }
  }

  const filtered = busqueda.trim()
    ? empresas.filter(e =>
        e.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        e.nit?.includes(busqueda) ||
        e.email?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : empresas

  const total     = empresas.length
  const pagadas   = empresas.filter(e => e.plan_pagado && e.activo).length
  const pendientes= empresas.filter(e => !e.plan_pagado && e.activo).length
  const inactivas = empresas.filter(e => !e.activo).length

  return (
    <div className={`ae-page ${selected ? 'ae-page--split' : ''}`}>

      {/* ── Panel izquierdo / principal ── */}
      <div className="ae-main">
        {/* Header */}
        <div className="ae-header">
          <div>
            <h1 className="ae-title">Usuarios & Pagos</h1>
            <p className="ae-subtitle">Gestiona el estado de cada empresa registrada</p>
          </div>
          <button className="ae-btn-refresh" onClick={cargar}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Actualizar
          </button>
        </div>

        {/* Stats */}
        <div className="ae-stats">
          <div className="ae-stat">
            <div className="ae-stat-n">{total}</div>
            <div className="ae-stat-l">Total registradas</div>
          </div>
          <div className="ae-stat ae-stat--green">
            <div className="ae-stat-n">{pagadas}</div>
            <div className="ae-stat-l">Al día</div>
          </div>
          <div className="ae-stat ae-stat--yellow">
            <div className="ae-stat-n">{pendientes}</div>
            <div className="ae-stat-l">Pendientes pago</div>
          </div>
          <div className="ae-stat ae-stat--red">
            <div className="ae-stat-n">{inactivas}</div>
            <div className="ae-stat-l">Inactivas</div>
          </div>
        </div>

        {/* Search */}
        <div className="ae-search-row">
          <div className="ae-search-wrap">
            <svg className="ae-search-icon" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="ae-search"
              placeholder="Buscar por nombre, NIT o email…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="ae-search-clear" onClick={() => setBusqueda('')}>×</button>
            )}
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="ae-loading"><div className="spinner" /></div>
        ) : (
          <div className="ae-table-wrap card">
            <table className="ae-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Plan</th>
                  <th>Pagado</th>
                  <th>Vence</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="7" className="ae-empty">Sin resultados</td></tr>
                ) : filtered.map(e => (
                  <tr
                    key={e.id}
                    className={`ae-row ${!e.activo ? 'ae-row--inactiva' : ''} ${selected?.id === e.id ? 'ae-row--selected' : ''}`}
                    onClick={() => setSelected(e)}
                  >
                    <td>
                      <div className="ae-nombre">{e.nombre}</div>
                      <div className="ae-nit">{e.nit} · {e.email}</div>
                    </td>
                    <td>
                      <span className="ae-plan-badge" style={{ '--pc': PLAN_COLOR[e.plan] || '#6366f1' }}>
                        {e.plan || 'esencial'}
                      </span>
                    </td>
                    <td onClick={ev => { ev.stopPropagation(); toggleRapido(e, 'plan_pagado', !e.plan_pagado) }}>
                      <button className={`ae-pago-btn ${e.plan_pagado ? 'ae-pago-btn--ok' : 'ae-pago-btn--pending'}`}>
                        {e.plan_pagado ? '✓ Pagado' : '· Pendiente'}
                      </button>
                    </td>
                    <td className="ae-fecha-col">{e.plan_vence_en ? fmt(e.plan_vence_en) : '—'}</td>
                    <td><DiasBadge dias={diasRestantes(e.plan_vence_en)} /></td>
                    <td onClick={ev => { ev.stopPropagation(); toggleRapido(e, 'activo', !e.activo) }}>
                      <button className={`ae-estado-btn ${e.activo ? 'ae-estado-btn--on' : 'ae-estado-btn--off'}`}>
                        {e.activo ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td className="ae-fecha-col">{fmt(e.created_at?.split('T')[0])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ae-table-footer">{filtered.length} empresa{filtered.length !== 1 ? 's' : ''}</div>
          </div>
        )}
      </div>

      {/* ── Panel de detalle ── */}
      {selected && (
        <DetallePanel
          empresa={selected}
          onClose={() => setSelected(null)}
          onSave={guardar}
          saving={saving}
        />
      )}
    </div>
  )
}
