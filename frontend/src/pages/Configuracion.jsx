import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'
import './Configuracion.css'

function Section({ title, subtitle, children }) {
  return (
    <div className="cfg-section card">
      <div className="cfg-section-head">
        <h2 className="cfg-section-title">{title}</h2>
        {subtitle && <p className="cfg-section-sub">{subtitle}</p>}
      </div>
      <div className="cfg-section-body">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="cfg-field">
      <label className="cfg-label">{label}</label>
      {hint && <p className="cfg-hint">{hint}</p>}
      {children}
    </div>
  )
}

export default function Configuracion() {
  const { empresa, updateEmpresa } = useAuth()

  // Formulario — info empresa
  const [info, setInfo] = useState({
    nombre:    empresa?.nombre    || '',
    email:     empresa?.email     || '',
    direccion: empresa?.direccion || '',
    telefono:  empresa?.telefono  || '',
  })

  // Formulario — DIAN
  const [dian, setDian] = useState({
    resolucion_numero:      empresa?.resolucion_numero      || '',
    resolucion_prefijo:     empresa?.resolucion_prefijo     || '',
    resolucion_desde:       empresa?.resolucion_desde       || '',
    resolucion_hasta:       empresa?.resolucion_hasta       || '',
    resolucion_fecha_desde: empresa?.resolucion_fecha_desde || '',
    resolucion_fecha_hasta: empresa?.resolucion_fecha_hasta || '',
  })

  // Formulario — MATIAS
  const [matias, setMatias] = useState({
    matias_email:    empresa?.matias_email    || '',
    matias_password: empresa?.matias_password || '',
  })
  const [showPass, setShowPass] = useState(false)

  // Estado guardado
  const [saving, setSaving]   = useState(null) // 'info' | 'dian' | 'matias'
  const [saved,  setSaved]    = useState(null)
  const [error,  setError]    = useState(null)

  async function guardar(seccion, campos) {
    setSaving(seccion)
    setError(null)
    setSaved(null)
    try {
      const { data } = await authApi.actualizarEmpresa(campos)
      if (data?.empresa) updateEmpresa(data.empresa)
      setSaved(seccion)
      setTimeout(() => setSaved(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(null)
    }
  }

  const f = (obj, set) => (k) => (e) => set({ ...obj, [k]: e.target.value })

  return (
    <div className="cfg-page">
      <div className="cfg-header">
        <h1 className="cfg-title">Configuración</h1>
        <p className="cfg-subtitle">Ajusta la información de tu empresa en AppDian</p>
      </div>

      {error && (
        <div className="cfg-alert cfg-alert--error">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Información de la empresa ── */}
      <Section
        title="Información de la empresa"
        subtitle="Estos datos aparecen en tus facturas y documentos."
      >
        <div className="cfg-grid-2">
          <Field label="Nombre / Razón social">
            <input className="cfg-input" value={info.nombre} onChange={f(info, setInfo)('nombre')} placeholder="Mi Empresa S.A.S." />
          </Field>
          <Field label="NIT" hint="El NIT no se puede modificar.">
            <input className="cfg-input cfg-input--readonly" value={empresa?.nit || ''} readOnly />
          </Field>
          <Field label="Correo electrónico">
            <input className="cfg-input" type="email" value={info.email} onChange={f(info, setInfo)('email')} placeholder="contacto@empresa.com" />
          </Field>
          <Field label="Teléfono">
            <input className="cfg-input" value={info.telefono} onChange={f(info, setInfo)('telefono')} placeholder="+57 310 000 0000" />
          </Field>
        </div>
        <Field label="Dirección">
          <input className="cfg-input" value={info.direccion} onChange={f(info, setInfo)('direccion')} placeholder="Calle 123 # 45-67, Bogotá" />
        </Field>
        <div className="cfg-actions">
          <button
            className="cfg-btn-save"
            onClick={() => guardar('info', info)}
            disabled={saving === 'info'}
          >
            {saving === 'info' ? 'Guardando…' : saved === 'info' ? '✓ Guardado' : 'Guardar cambios'}
          </button>
        </div>
      </Section>

      {/* ── Configuración DIAN ── */}
      <Section
        title="Resolución de facturación DIAN"
        subtitle="Datos de la resolución que te asignó la DIAN para emitir Facturas Electrónicas."
      >
        <div className="cfg-dian-info">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          La DIAN te entrega esta resolución cuando habilitas la facturación electrónica. Si no la tienes aún, puedes dejarlo vacío y completarlo después.
        </div>

        <div className="cfg-grid-2">
          <Field label="Número de resolución" hint="Ej: 18764062715123">
            <input className="cfg-input" value={dian.resolucion_numero} onChange={f(dian, setDian)('resolucion_numero')} placeholder="18764062715123" />
          </Field>
          <Field label="Prefijo" hint="Ej: SETT, FE, POS (puede estar vacío)">
            <input className="cfg-input" value={dian.resolucion_prefijo} onChange={f(dian, setDian)('resolucion_prefijo')} placeholder="SETT" />
          </Field>
          <Field label="Numeración desde">
            <input className="cfg-input" type="number" min="1" value={dian.resolucion_desde} onChange={f(dian, setDian)('resolucion_desde')} placeholder="1" />
          </Field>
          <Field label="Numeración hasta">
            <input className="cfg-input" type="number" min="1" value={dian.resolucion_hasta} onChange={f(dian, setDian)('resolucion_hasta')} placeholder="5000" />
          </Field>
          <Field label="Fecha inicio vigencia">
            <input className="cfg-input" type="date" value={dian.resolucion_fecha_desde} onChange={f(dian, setDian)('resolucion_fecha_desde')} />
          </Field>
          <Field label="Fecha fin vigencia">
            <input className="cfg-input" type="date" value={dian.resolucion_fecha_hasta} onChange={f(dian, setDian)('resolucion_fecha_hasta')} />
          </Field>
        </div>
        <div className="cfg-actions">
          <button
            className="cfg-btn-save"
            onClick={() => guardar('dian', dian)}
            disabled={saving === 'dian'}
          >
            {saving === 'dian' ? 'Guardando…' : saved === 'dian' ? '✓ Guardado' : 'Guardar resolución'}
          </button>
        </div>
      </Section>

      {/* ── Integración MATIAS ── */}
      <Section
        title="Integración MATIAS (API DIAN)"
        subtitle="Credenciales para conectar AppDian con el proveedor de facturación electrónica."
      >
        <div className="cfg-matias-estado">
          <div className={`cfg-matias-dot ${empresa?.matias_email ? 'cfg-matias-dot--on' : ''}`} />
          <span>{empresa?.matias_email ? 'Conectado' : 'Sin configurar — las facturas se guardan en modo prueba'}</span>
        </div>

        <div className="cfg-grid-2">
          <Field label="Email MATIAS">
            <input className="cfg-input" type="email" value={matias.matias_email} onChange={f(matias, setMatias)('matias_email')} placeholder="usuario@matias.com.co" />
          </Field>
          <Field label="Contraseña MATIAS">
            <div className="cfg-pass-wrap">
              <input
                className="cfg-input cfg-input--pass"
                type={showPass ? 'text' : 'password'}
                value={matias.matias_password}
                onChange={f(matias, setMatias)('matias_password')}
                placeholder="••••••••"
              />
              <button className="cfg-pass-eye" onClick={() => setShowPass(v => !v)} type="button">
                {showPass ? (
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </Field>
        </div>
        <div className="cfg-actions">
          <button
            className="cfg-btn-save"
            onClick={() => guardar('matias', matias)}
            disabled={saving === 'matias'}
          >
            {saving === 'matias' ? 'Guardando…' : saved === 'matias' ? '✓ Guardado' : 'Guardar credenciales'}
          </button>
        </div>
      </Section>
    </div>
  )
}
