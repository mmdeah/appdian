const supabase = require('../config/db')
const audit   = require('../services/auditService')

// ── Tarifas SIMPLE (Colombia, por rangos en UVT) ──────────────────────────────
const TARIFAS_SIMPLE = {
  COMERCIO:    [{ max: 6000, t: 1.8 }, { max: 15000, t: 2.8 }, { max: 30000, t: 3.9  }, { max: Infinity, t: 5.4  }],
  SERVICIOS:   [{ max: 6000, t: 4.9 }, { max: 15000, t: 5.3 }, { max: 30000, t: 7.0  }, { max: Infinity, t: 8.3  }],
  PROFESIONAL: [{ max: 6000, t: 5.5 }, { max: 15000, t: 7.4 }, { max: 30000, t: 10.7 }, { max: Infinity, t: 14.5 }],
  COMIDAS:     [{ max: 6000, t: 3.4 }, { max: 15000, t: 3.8 }, { max: 30000, t: 5.5  }, { max: Infinity, t: 6.0  }],
}

const ACTIVIDAD_LABEL = {
  COMERCIO: 'Comercio al por mayor y detal',
  SERVICIOS: 'Servicios generales',
  PROFESIONAL: 'Servicios profesionales / consultoría',
  COMIDAS: 'Expendio de comidas y bebidas',
}

const UVT = 49799  // UVT 2025 (valor oficial Resolución DIAN)

function getTarifaSimple(actividad, ingresos_uvt) {
  const tabla = TARIFAS_SIMPLE[actividad] || TARIFAS_SIMPLE.COMERCIO
  const fila = tabla.find(r => ingresos_uvt <= r.max)
  return fila ? fila.t : tabla[tabla.length - 1].t
}

function getLabelRangoSimple(actividad, ingresos_uvt) {
  const tabla = TARIFAS_SIMPLE[actividad] || TARIFAS_SIMPLE.COMERCIO
  let prev = 0
  for (const fila of tabla) {
    if (ingresos_uvt <= fila.max) {
      return fila.max === Infinity
        ? `Más de ${prev.toLocaleString('es-CO')} UVT`
        : `${prev.toLocaleString('es-CO')} – ${fila.max.toLocaleString('es-CO')} UVT`
    }
    prev = fila.max
  }
  return ''
}

// ── Períodos ──────────────────────────────────────────────────────────────────
function getBimestreActual(año, mes) {
  const bim = Math.ceil(mes / 2)
  const inicio = new Date(año, (bim - 1) * 2, 1)
  const fin    = new Date(año, bim * 2, 0)
  const nombres = ['','Ene-Feb','Mar-Abr','May-Jun','Jul-Ago','Sep-Oct','Nov-Dic']
  const mesVence = new Date(año, bim * 2, 1)
  return {
    numero: bim,
    label: `${nombres[bim]} ${año}`,
    inicio: inicio.toISOString().split('T')[0],
    fin:    fin.toISOString().split('T')[0],
    vence_label: mesVence.toLocaleString('es-CO', { month: 'long', year: 'numeric' }),
  }
}

function getCuatrimestreActual(año, mes) {
  const c = mes <= 4 ? 1 : mes <= 8 ? 2 : 3
  const inicioMes = (c - 1) * 4
  const inicio = new Date(año, inicioMes, 1)
  const fin    = new Date(año, inicioMes + 4, 0)
  const labels = ['','Ene-Abr','May-Ago','Sep-Dic']
  return { numero: c, label: `${labels[c]} ${año}`, inicio: inicio.toISOString().split('T')[0], fin: fin.toISOString().split('T')[0] }
}

// ── GET /api/proyecciones ─────────────────────────────────────────────────────
const resumen = async (req, res) => {
  const empresa_id = req.user.empresa_id
  const hoy = new Date()
  const año  = hoy.getFullYear()
  const mes  = hoy.getMonth() + 1
  const bimestre     = getBimestreActual(año, mes)
  const cuatrimestre = getCuatrimestreActual(año, mes)
  const inicioAño    = new Date(año, 0, 1)
  const diasAño      = Math.ceil((hoy - inicioAño) / 86400000) + 1
  const diasTotales  = 365

  try {
    // Obtener datos de empresa (incluyendo régimen)
    const { data: empresa } = await supabase
      .from('empresas')
      .select('regimen, actividad_simple')
      .eq('id', empresa_id)
      .single()

    const regimen          = empresa?.regimen || 'ORDINARIO'
    const actividad_simple = empresa?.actividad_simple || 'COMERCIO'

    // IVA bimestre actual
    const { data: bimData } = await supabase
      .from('facturas').select('iva, subtotal')
      .eq('empresa_id', empresa_id).in('estado', ['APROBADA', 'PENDIENTE'])
      .gte('created_at', bimestre.inicio + 'T00:00:00')
      .lte('created_at', bimestre.fin   + 'T23:59:59')

    const iva_bimestre      = (bimData || []).reduce((s, f) => s + (f.iva || 0), 0)
    const facturas_bimestre = (bimData || []).length

    // IVA cuatrimestre actual
    const { data: cuatData } = await supabase
      .from('facturas').select('iva')
      .eq('empresa_id', empresa_id).in('estado', ['APROBADA', 'PENDIENTE'])
      .gte('created_at', cuatrimestre.inicio + 'T00:00:00')
      .lte('created_at', cuatrimestre.fin    + 'T23:59:59')

    const iva_cuatrimestre = (cuatData || []).reduce((s, f) => s + (f.iva || 0), 0)

    // Ingresos del año
    const { data: añoData } = await supabase
      .from('facturas').select('subtotal, iva')
      .eq('empresa_id', empresa_id).in('estado', ['APROBADA', 'PENDIENTE'])
      .gte('created_at', `${año}-01-01T00:00:00`)
      .lte('created_at', `${año}-12-31T23:59:59`)

    const ingresos_año    = (añoData || []).reduce((s, f) => s + (f.subtotal || 0), 0)
    const facturas_año    = (añoData || []).length
    const factor          = diasAño > 0 ? diasTotales / diasAño : 1
    const proyeccion_anual = ingresos_año * factor

    // Ingresos mes actual
    const { data: mesData } = await supabase
      .from('facturas').select('subtotal, iva')
      .eq('empresa_id', empresa_id).in('estado', ['APROBADA', 'PENDIENTE'])
      .gte('created_at', `${año}-${String(mes).padStart(2,'0')}-01T00:00:00`)
      .lte('created_at', hoy.toISOString())

    const ingresos_mes = (mesData || []).reduce((s, f) => s + (f.subtotal || 0), 0)
    const iva_mes      = (mesData || []).reduce((s, f) => s + (f.iva || 0), 0)

    // ── Cálculos por régimen ──────────────────────────────────────────────────
    const LIMITE_SIMPLE_COP = UVT * 100000
    const pct_limite_simple = Math.min((proyeccion_anual / LIMITE_SIMPLE_COP) * 100, 100)

    let impuesto = {}
    if (regimen === 'SIMPLE') {
      const proyeccion_uvt  = proyeccion_anual / UVT
      const tarifa_pct      = getTarifaSimple(actividad_simple, proyeccion_uvt)
      const impuesto_simple = proyeccion_anual * (tarifa_pct / 100)
      impuesto = {
        tipo: 'SIMPLE',
        actividad: actividad_simple,
        actividad_label: ACTIVIDAD_LABEL[actividad_simple],
        proyeccion_uvt: Math.round(proyeccion_uvt),
        tarifa_pct,
        rango_label: getLabelRangoSimple(actividad_simple, proyeccion_uvt),
        impuesto_estimado: impuesto_simple,
        // Anticipo bimestral: 1/6 del impuesto anual estimado
        anticipo_bimestral: impuesto_simple / 6,
      }
    } else {
      const renta_estimada = proyeccion_anual * 0.35
      impuesto = {
        tipo: 'ORDINARIO',
        renta_estimada_35: renta_estimada,
        anticipo_estimado: renta_estimada * 0.75,
      }
    }

    res.json({
      config: { regimen, actividad_simple },
      periodo: {
        año, mes,
        dias_transcurridos: diasAño,
        avance_año_pct: Math.round((diasAño / diasTotales) * 100),
        bimestre,
        cuatrimestre,
      },
      iva: {
        bimestre_label:          bimestre.label,
        acumulado_bimestre:      iva_bimestre,
        facturas_bimestre,
        cuatrimestre_label:      cuatrimestre.label,
        acumulado_cuatrimestre:  iva_cuatrimestre,
        mes_actual:              iva_mes,
      },
      renta: {
        ingresos_año,
        ingresos_mes,
        facturas_año,
        proyeccion_anual,
        factor_proyeccion: Math.round(factor * 100) / 100,
      },
      impuesto,
      regimen_simple: {
        uvt:             UVT,
        limite_cop:      LIMITE_SIMPLE_COP,
        proyeccion_anual,
        pct_limite:      Math.round(pct_limite_simple * 10) / 10,
        alerta:          pct_limite_simple >= 80,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── PATCH /api/proyecciones/config ────────────────────────────────────────────
const actualizarConfig = async (req, res) => {
  const empresa_id = req.user.empresa_id
  const { regimen, actividad_simple } = req.body
  try {
    const updates = {}
    if (regimen)          updates.regimen = regimen
    if (actividad_simple) updates.actividad_simple = actividad_simple

    const { data, error } = await supabase
      .from('empresas')
      .update(updates)
      .eq('id', empresa_id)
      .select('regimen, actividad_simple')
      .single()

    if (error) throw error
    audit.log({ tipo: 'CONFIG_REGIMEN', descripcion: `Régimen actualizado a ${data.regimen}${data.actividad_simple ? ` (actividad: ${data.actividad_simple})` : ''}`, empresa_id })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { resumen, actualizarConfig }
