import { useState, useEffect } from 'react'
import { proyeccionesApi } from '../api/client'
import './Proyecciones.css'

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const ACTIVIDADES = [
  { value: 'COMERCIO',    label: 'Comercio (mayor/detal)',         rango: '1.8% – 5.4%' },
  { value: 'SERVICIOS',   label: 'Servicios generales',            rango: '4.9% – 8.3%' },
  { value: 'PROFESIONAL', label: 'Servicios profesionales',        rango: '5.5% – 14.5%' },
  { value: 'COMIDAS',     label: 'Comidas y bebidas',              rango: '3.4% – 6.0%' },
]

function BarraProgreso({ pct, color = 'accent', label, sublabel }) {
  const clamp = Math.min(Math.max(pct || 0), 100)
  return (
    <div className="barra-wrap">
      <div className="barra-header">
        <span className="barra-label">{label}</span>
        <span className="barra-pct" style={{ color: `var(--${color})` }}>{clamp.toFixed(1)}%</span>
      </div>
      <div className="barra-track">
        <div className="barra-fill" style={{ width: `${clamp}%`, background: `var(--${color})` }} />
      </div>
      {sublabel && <p className="barra-sub">{sublabel}</p>}
    </div>
  )
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="info-row">
      <span className="info-key">{label}</span>
      <span className={`info-val ${highlight ? 'info-val--highlight' : ''}`}>{value}</span>
    </div>
  )
}

function Card({ titulo, children, badge, badgeColor, dark }) {
  return (
    <div className={`proy-card ${dark ? 'proy-card--dark' : ''}`}>
      <div className="proy-card-head">
        <p className="proy-card-titulo">{titulo}</p>
        {badge && <span className={`proy-badge proy-badge--${badgeColor || 'neutral'}`}>{badge}</span>}
      </div>
      <div className="proy-card-body">{children}</div>
    </div>
  )
}

export default function Proyecciones() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [config, setConfig]   = useState({ regimen: 'ORDINARIO', actividad_simple: 'COMERCIO' })

  function cargar() {
    setLoading(true)
    proyeccionesApi.resumen()
      .then(({ data }) => {
        setData(data)
        setConfig({ regimen: data.config.regimen, actividad_simple: data.config.actividad_simple || 'COMERCIO' })
      })
      .catch(() => setError('No se pudieron cargar las proyecciones'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { cargar() }, [])

  async function guardarConfig(nuevaConfig) {
    setSaving(true)
    try {
      await proyeccionesApi.actualizarConfig(nuevaConfig)
      cargar()
    } finally { setSaving(false) }
  }

  function handleRegimen(regimen) {
    const nuevo = { ...config, regimen }
    setConfig(nuevo)
    guardarConfig(nuevo)
  }

  function handleActividad(actividad_simple) {
    const nuevo = { ...config, actividad_simple }
    setConfig(nuevo)
    guardarConfig(nuevo)
  }

  if (loading) return <div className="proy-loading"><div className="spinner" /></div>
  if (error)   return <div className="proy-error">{error}</div>

  const { periodo, iva, renta, impuesto, regimen_simple } = data
  const esSimple = config.regimen === 'SIMPLE'

  const pct_bimestre = (() => {
    const ini  = new Date(periodo.bimestre.inicio + 'T00:00:00')
    const fin  = new Date(periodo.bimestre.fin   + 'T23:59:59')
    const hoy  = new Date()
    const total = (fin - ini) / 86400000
    const trans = Math.min((hoy - ini) / 86400000, total)
    return Math.max((trans / total) * 100, 0)
  })()

  return (
    <div className="proyecciones-page">
      <div className="proy-header">
        <div>
          <h2 className="proy-titulo">Proyecciones tributarias</h2>
          <p className="proy-subtitulo muted">
            Estimaciones en tiempo real basadas en tus facturas · Año {periodo.año}
          </p>
        </div>
        <div className="proy-avance-badge">
          <span className="avance-num">{periodo.avance_año_pct}%</span>
          <span className="avance-lab">del año</span>
        </div>
      </div>

      {/* Config de régimen */}
      <div className="regimen-config">
        <div className="regimen-toggles">
          <span className="regimen-label">Régimen:</span>
          <button
            className={`regimen-btn ${config.regimen === 'ORDINARIO' ? 'regimen-btn--active' : ''}`}
            onClick={() => handleRegimen('ORDINARIO')}
            disabled={saving}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            Régimen Ordinario
          </button>
          <button
            className={`regimen-btn ${config.regimen === 'SIMPLE' ? 'regimen-btn--active' : ''}`}
            onClick={() => handleRegimen('SIMPLE')}
            disabled={saving}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            Régimen SIMPLE
          </button>
        </div>
        {esSimple && (
          <div className="actividad-select-wrap">
            <span className="regimen-label">Actividad:</span>
            <select
              className="actividad-select"
              value={config.actividad_simple}
              onChange={e => handleActividad(e.target.value)}
              disabled={saving}
            >
              {ACTIVIDADES.map(a => (
                <option key={a.value} value={a.value}>{a.label} ({a.rango})</option>
              ))}
            </select>
          </div>
        )}
        {saving && <span className="regimen-saving">Guardando...</span>}
      </div>

      <div className="proy-grid">

        {/* IVA del período */}
        <Card
          titulo={esSimple ? 'IVA cuatrimestral' : 'IVA bimestral'}
          badge={esSimple ? periodo.cuatrimestre.label : periodo.bimestre.label}
          badgeColor="accent"
        >
          <div className="iva-monto">{COP(esSimple ? iva.acumulado_cuatrimestre : iva.acumulado_bimestre)}</div>
          <p className="iva-desc">
            Generado en {iva.facturas_bimestre} factura{iva.facturas_bimestre !== 1 ? 's' : ''} del período actual
          </p>
          <BarraProgreso
            pct={pct_bimestre}
            color="accent"
            label="Avance del período"
            sublabel={`Vence en ${periodo.bimestre.vence_label}`}
          />
          <div className="proy-divider" />
          <InfoRow label="IVA este mes" value={COP(iva.mes_actual)} />
          {!esSimple && (
            <InfoRow label={`IVA cuatrimestre ${periodo.cuatrimestre.label}`} value={COP(iva.acumulado_cuatrimestre)} />
          )}
        </Card>

        {/* Impuesto según régimen */}
        {esSimple ? (
          <Card titulo="Impuesto SIMPLE estimado" badge={`${impuesto.tarifa_pct}%`} badgeColor="success">
            <div className="iva-monto">{COP(impuesto.impuesto_estimado)}</div>
            <p className="iva-desc">
              Proyección anual · {impuesto.actividad_label}
            </p>
            <BarraProgreso
              pct={periodo.avance_año_pct}
              color="success"
              label="Avance del año"
              sublabel={`Llevas ${COP(renta.ingresos_año)} en ingresos reales`}
            />
            <div className="proy-divider" />
            <InfoRow label="Proyección anual"     value={COP(renta.proyeccion_anual)} />
            <InfoRow label={`Proyección en UVT`}  value={`${impuesto.proyeccion_uvt?.toLocaleString('es-CO')} UVT`} />
            <InfoRow label="Rango tarifario"      value={impuesto.rango_label} />
            <InfoRow label="Tarifa aplicable"     value={`${impuesto.tarifa_pct}%`} highlight />
            <InfoRow label="Anticipo bimestral"   value={COP(impuesto.anticipo_bimestral)} />
          </Card>
        ) : (
          <Card titulo="Renta estimada" badge={`${periodo.año}`} badgeColor="warning">
            <div className="iva-monto">{COP(renta.proyeccion_anual)}</div>
            <p className="iva-desc">
              Proyección anual · {renta.facturas_año} factura{renta.facturas_año !== 1 ? 's' : ''} hasta hoy
            </p>
            <BarraProgreso
              pct={periodo.avance_año_pct}
              color="warning"
              label="Avance del año"
              sublabel={`Llevas ${COP(renta.ingresos_año)} en ingresos reales`}
            />
            <div className="proy-divider" />
            <InfoRow label="Impuesto estimado (35%)" value={COP(impuesto.renta_estimada_35)} highlight />
            <InfoRow label="Anticipo estimado (75%)" value={COP(impuesto.anticipo_estimado)} />
            <InfoRow label="Ingresos este mes"       value={COP(renta.ingresos_mes)} />
          </Card>
        )}

        {/* Límite SIMPLE */}
        <Card
          titulo="Límite Régimen SIMPLE"
          badge={regimen_simple.alerta ? '⚠️ Alerta' : esSimple ? 'Dentro del límite' : 'Referencia'}
          badgeColor={regimen_simple.alerta ? 'danger' : 'success'}
        >
          <div className={`iva-monto ${regimen_simple.alerta ? 'texto-alerta' : ''}`}>
            {regimen_simple.pct_limite}%
          </div>
          <p className="iva-desc">del límite de 100.000 UVT ({COP(regimen_simple.limite_cop)})</p>
          <BarraProgreso
            pct={regimen_simple.pct_limite}
            color={regimen_simple.alerta ? 'danger' : esSimple ? 'success' : 'info'}
            label="Proyección anual vs límite SIMPLE"
            sublabel={`UVT ${periodo.año}: ${COP(regimen_simple.uvt)}`}
          />
          {regimen_simple.alerta && (
            <div className="alerta-box">
              <span>⚠️</span>
              <p>Tu proyección supera el 80% del límite de SIMPLE. Consulta con tu contador si debes cambiar de régimen.</p>
            </div>
          )}
          {!esSimple && !regimen_simple.alerta && (
            <div className="info-box">
              <p>Estás en Régimen Ordinario. El límite de SIMPLE se muestra como referencia informativa.</p>
            </div>
          )}
          <div className="proy-divider" />
          <InfoRow label="Proyección anual"   value={COP(renta.proyeccion_anual)} />
          <InfoRow label="Límite SIMPLE"      value={COP(regimen_simple.limite_cop)} />
        </Card>

        {/* Períodos activos */}
        <Card titulo="Períodos tributarios activos" dark>
          <div className="periodos-grid">
            <div className="periodo-item">
              <p className="periodo-tipo">{esSimple ? 'Cuatrimestre IVA' : 'Bimestre IVA'}</p>
              <p className="periodo-rango">{esSimple ? periodo.cuatrimestre.label : periodo.bimestre.label}</p>
              <p className="periodo-fecha muted">
                {esSimple
                  ? `${periodo.cuatrimestre.inicio} → ${periodo.cuatrimestre.fin}`
                  : `${periodo.bimestre.inicio} → ${periodo.bimestre.fin}`}
              </p>
            </div>
            <div className="periodo-item">
              <p className="periodo-tipo">Renta</p>
              <p className="periodo-rango">Año gravable {periodo.año}</p>
              <p className="periodo-fecha muted">Ene 1 → Dic 31</p>
            </div>
            {esSimple && (
              <div className="periodo-item">
                <p className="periodo-tipo">Declaración SIMPLE</p>
                <p className="periodo-rango">Octubre {periodo.año}</p>
                <p className="periodo-fecha muted">Declaración anual unificada</p>
              </div>
            )}
          </div>
          <div className="proy-divider" />
          <p className="disclaimer">
            💡 Proyecciones estimativas basadas en el ritmo de facturación actual.
            Valida siempre con tu contador.
          </p>
        </Card>

      </div>
    </div>
  )
}
