const supabase = require('../config/db')

// ── Utilidades de períodos tributarios colombianos ────────────────────────────

function getBimestreActual(año, mes) {
  // Bimestres: 1(Ene-Feb) 2(Mar-Abr) 3(May-Jun) 4(Jul-Ago) 5(Sep-Oct) 6(Nov-Dic)
  const bim = Math.ceil(mes / 2)
  const inicio = new Date(año, (bim - 1) * 2, 1)
  const fin    = new Date(año, bim * 2, 0)
  const nombres = ['','Ene-Feb','Mar-Abr','May-Jun','Jul-Ago','Sep-Oct','Nov-Dic']
  return {
    numero: bim,
    label: `${nombres[bim]} ${año}`,
    inicio: inicio.toISOString().split('T')[0],
    fin:    fin.toISOString().split('T')[0],
    // Fecha de vencimiento: suele ser en el mes siguiente al cierre del bimestre
    vence_label: `${new Date(año, bim * 2, 1).toLocaleString('es-CO', { month: 'long' })} ${año}`,
  }
}

function getCuatrimestreActual(año, mes) {
  // Cuatrimestres: 1(Ene-Abr) 2(May-Ago) 3(Sep-Dic)
  const c = mes <= 4 ? 1 : mes <= 8 ? 2 : 3
  const inicioMes = (c - 1) * 4
  const inicio = new Date(año, inicioMes, 1)
  const fin    = new Date(año, inicioMes + 4, 0)
  const labels = ['','Ene-Abr','May-Ago','Sep-Dic']
  return {
    numero: c,
    label: `${labels[c]} ${año}`,
    inicio: inicio.toISOString().split('T')[0],
    fin:    fin.toISOString().split('T')[0],
  }
}

// ── GET /api/proyecciones ─────────────────────────────────────────────────────
const resumen = async (req, res) => {
  const empresa_id = req.user.empresa_id
  const hoy = new Date()
  const año  = hoy.getFullYear()
  const mes  = hoy.getMonth() + 1   // 1-12
  const dia  = hoy.getDate()

  const bimestre     = getBimestreActual(año, mes)
  const cuatrimestre = getCuatrimestreActual(año, mes)

  // Días transcurridos en el año
  const inicioAño = new Date(año, 0, 1)
  const diasAño   = Math.ceil((hoy - inicioAño) / 86400000) + 1
  const diasTotales = 365

  try {
    // ── 1. IVA del bimestre actual ────────────────────────────────────────────
    const { data: bimData } = await supabase
      .from('facturas')
      .select('iva, subtotal, total')
      .eq('empresa_id', empresa_id)
      .in('estado', ['APROBADA', 'PENDIENTE'])
      .gte('created_at', bimestre.inicio + 'T00:00:00')
      .lte('created_at', bimestre.fin   + 'T23:59:59')

    const iva_bimestre      = (bimData || []).reduce((s, f) => s + (f.iva || 0), 0)
    const facturas_bimestre = (bimData || []).length

    // ── 2. IVA del cuatrimestre actual ────────────────────────────────────────
    const { data: cuatData } = await supabase
      .from('facturas')
      .select('iva')
      .eq('empresa_id', empresa_id)
      .in('estado', ['APROBADA', 'PENDIENTE'])
      .gte('created_at', cuatrimestre.inicio + 'T00:00:00')
      .lte('created_at', cuatrimestre.fin    + 'T23:59:59')

    const iva_cuatrimestre = (cuatData || []).reduce((s, f) => s + (f.iva || 0), 0)

    // ── 3. Ingresos del año (base para renta) ─────────────────────────────────
    const { data: añoData } = await supabase
      .from('facturas')
      .select('subtotal, total, iva')
      .eq('empresa_id', empresa_id)
      .in('estado', ['APROBADA', 'PENDIENTE'])
      .gte('created_at', `${año}-01-01T00:00:00`)
      .lte('created_at', `${año}-12-31T23:59:59`)

    const ingresos_año    = (añoData || []).reduce((s, f) => s + (f.subtotal || 0), 0)
    const facturas_año    = (añoData || []).length

    // Proyección lineal al cierre del año
    const factor_proyeccion = diasAño > 0 ? diasTotales / diasAño : 1
    const proyeccion_anual  = ingresos_año * factor_proyeccion

    // ── 4. Renta estimada ─────────────────────────────────────────────────────
    // Tarifa general personas jurídicas: 35%
    const renta_estimada_35  = proyeccion_anual * 0.35
    // Anticipo del 75% de lo pagado el año anterior (simplificado: 75% de la estimación)
    const anticipo_estimado  = renta_estimada_35 * 0.75

    // ── 5. Régimen SIMPLE ─────────────────────────────────────────────────────
    // UVT 2025: $49.799 | Límite SIMPLE: 100.000 UVT
    const UVT_2025 = 49799
    const LIMITE_SIMPLE_UVT = 100000
    const limite_simple_cop = UVT_2025 * LIMITE_SIMPLE_UVT   // ~$4.979.900.000
    const pct_limite_simple = Math.min((proyeccion_anual / limite_simple_cop) * 100, 100)
    const alerta_simple = pct_limite_simple >= 80  // Alerta si supera el 80%

    // ── 6. Mes actual ─────────────────────────────────────────────────────────
    const { data: mesData } = await supabase
      .from('facturas')
      .select('subtotal, iva')
      .eq('empresa_id', empresa_id)
      .in('estado', ['APROBADA', 'PENDIENTE'])
      .gte('created_at', `${año}-${String(mes).padStart(2,'0')}-01T00:00:00`)
      .lte('created_at', hoy.toISOString())

    const ingresos_mes = (mesData || []).reduce((s, f) => s + (f.subtotal || 0), 0)
    const iva_mes      = (mesData || []).reduce((s, f) => s + (f.iva || 0), 0)

    res.json({
      periodo: {
        año,
        mes,
        dia,
        dias_transcurridos: diasAño,
        avance_año_pct: Math.round((diasAño / diasTotales) * 100),
        bimestre,
        cuatrimestre,
      },
      iva: {
        bimestre_label:  bimestre.label,
        acumulado_bimestre: iva_bimestre,
        facturas_bimestre,
        cuatrimestre_label: cuatrimestre.label,
        acumulado_cuatrimestre: iva_cuatrimestre,
        mes_actual: iva_mes,
      },
      renta: {
        ingresos_año,
        ingresos_mes,
        facturas_año,
        proyeccion_anual,
        renta_estimada_35,
        anticipo_estimado,
        factor_proyeccion: Math.round(factor_proyeccion * 100) / 100,
      },
      regimen_simple: {
        uvt: UVT_2025,
        limite_uvt: LIMITE_SIMPLE_UVT,
        limite_cop: limite_simple_cop,
        proyeccion_anual,
        pct_limite: Math.round(pct_limite_simple * 10) / 10,
        alerta: alerta_simple,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { resumen }
