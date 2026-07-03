import { useState, useEffect } from 'react'
import { proyeccionesApi } from '../api/client'
import './Proyecciones.css'

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

function BarraProgreso({ pct, color = 'accent', label, sublabel }) {
  const clamp = Math.min(Math.max(pct || 0), 100)
  return (
    <div className="barra-wrap">
      <div className="barra-header">
        <span className="barra-label">{label}</span>
        <span className="barra-pct" style={{ color: `var(--${color})` }}>{clamp.toFixed(1)}%</span>
      </div>
      <div className="barra-track">
        <div
          className="barra-fill"
          style={{ width: `${clamp}%`, background: `var(--${color})` }}
        />
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

function Card({ titulo, children, badge, badgeColor }) {
  return (
    <div className="proy-card">
      <div className="proy-card-head">
        <p className="proy-card-titulo">{titulo}</p>
        {badge && <span className={`proy-badge proy-badge--${badgeColor || 'neutral'}`}>{badge}</span>}
      </div>
      <div className="proy-card-body">{children}</div>
    </div>
  )
}

export default function Proyecciones() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    proyeccionesApi.resumen()
      .then(({ data }) => setData(data))
      .catch(() => setError('No se pudieron cargar las proyecciones'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="proy-loading"><div className="spinner" /></div>
  if (error)   return <div className="proy-error">{error}</div>

  const { periodo, iva, renta, regimen_simple } = data

  const pct_bimestre = periodo.dias_transcurridos > 0
    ? (() => {
        const ini = new Date(periodo.bimestre.inicio)
        const fin = new Date(periodo.bimestre.fin)
        const hoy = new Date()
        const total = (fin - ini) / 86400000 + 1
        const trans = Math.min((hoy - ini) / 86400000 + 1, total)
        return (trans / total) * 100
      })()
    : 0

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

      <div className="proy-grid">

        {/* ── IVA Bimestral ── */}
        <Card
          titulo="IVA acumulado"
          badge={periodo.bimestre.label}
          badgeColor="accent"
        >
          <div className="iva-monto">{COP(iva.acumulado_bimestre)}</div>
          <p className="iva-desc">
            Generado en {iva.facturas_bimestre} factura{iva.facturas_bimestre !== 1 ? 's' : ''} del bimestre actual
          </p>
          <BarraProgreso
            pct={pct_bimestre}
            color="accent"
            label="Avance del bimestre"
            sublabel={`Vence en ${periodo.bimestre.vence_label}`}
          />
          <div className="proy-divider" />
          <InfoRow
            label={`Cuatrimestre ${periodo.cuatrimestre.label}`}
            value={COP(iva.acumulado_cuatrimestre)}
          />
          <InfoRow
            label="IVA este mes"
            value={COP(iva.mes_actual)}
          />
        </Card>

        {/* ── Renta ── */}
        <Card
          titulo="Renta estimada"
          badge={`${periodo.año}`}
          badgeColor="warning"
        >
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
          <InfoRow
            label="Impuesto estimado (35%)"
            value={COP(renta.renta_estimada_35)}
            highlight
          />
          <InfoRow
            label="Anticipo estimado (75%)"
            value={COP(renta.anticipo_estimado)}
          />
          <InfoRow
            label="Ingresos este mes"
            value={COP(renta.ingresos_mes)}
          />
        </Card>

        {/* ── Régimen SIMPLE ── */}
        <Card
          titulo="Límite Régimen SIMPLE"
          badge={regimen_simple.alerta ? '⚠️ Alerta' : 'OK'}
          badgeColor={regimen_simple.alerta ? 'danger' : 'success'}
        >
          <div className={`iva-monto ${regimen_simple.alerta ? 'texto-alerta' : ''}`}>
            {regimen_simple.pct_limite}%
          </div>
          <p className="iva-desc">
            del límite anual de 100.000 UVT ({COP(regimen_simple.limite_cop)})
          </p>
          <BarraProgreso
            pct={regimen_simple.pct_limite}
            color={regimen_simple.alerta ? 'danger' : 'success'}
            label="Proyección vs límite SIMPLE"
            sublabel={`UVT ${periodo.año}: ${COP(regimen_simple.uvt)}`}
          />
          {regimen_simple.alerta && (
            <div className="alerta-box">
              <span>⚠️</span>
              <p>Tu proyección anual supera el 80% del límite de SIMPLE. Consulta con tu contador si debes cambiar de régimen.</p>
            </div>
          )}
          <div className="proy-divider" />
          <InfoRow label="Proyección anual"  value={COP(regimen_simple.proyeccion_anual)} />
          <InfoRow label="Límite SIMPLE"     value={COP(regimen_simple.limite_cop)} />
        </Card>

        {/* ── Resumen de períodos ── */}
        <Card titulo="Períodos tributarios activos">
          <div className="periodos-grid">
            <div className="periodo-item">
              <p className="periodo-tipo">Bimestre IVA</p>
              <p className="periodo-rango">{periodo.bimestre.label}</p>
              <p className="periodo-fecha muted">{periodo.bimestre.inicio} → {periodo.bimestre.fin}</p>
            </div>
            <div className="periodo-item">
              <p className="periodo-tipo">Cuatrimestre IVA</p>
              <p className="periodo-rango">{periodo.cuatrimestre.label}</p>
              <p className="periodo-fecha muted">{periodo.cuatrimestre.inicio} → {periodo.cuatrimestre.fin}</p>
            </div>
            <div className="periodo-item">
              <p className="periodo-tipo">Renta</p>
              <p className="periodo-rango">Año gravable {periodo.año}</p>
              <p className="periodo-fecha muted">Ene 1 → Dic 31</p>
            </div>
          </div>
          <div className="proy-divider" />
          <p className="disclaimer">
            💡 Estas proyecciones son estimativas basadas en el ritmo actual de facturación.
            Consulta a tu contador para validación oficial.
          </p>
        </Card>

      </div>
    </div>
  )
}
