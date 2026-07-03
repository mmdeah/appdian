const supabase = require('../config/db')

// ── Fechas base aproximadas DIAN Colombia (se desplazan según último dígito NIT)
// El dígito 0 = fecha base, dígito N = base + N días hábiles (simplificado: +N días)
function addDias(fechaStr, dias) {
  const d = new Date(fechaStr + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}

function calcularObligaciones(año, digito, regimen) {
  const d = digito  // último dígito del NIT (0-9)
  const obs = []

  if (regimen === 'SIMPLE') {
    // IVA cuatrimestral
    const cuatDates = [
      { base: `${año}-05-11`, label: `IVA cuatrimestral Ene–Abr ${año}` },
      { base: `${año}-09-09`, label: `IVA cuatrimestral May–Ago ${año}` },
      { base: `${año + 1}-01-12`, label: `IVA cuatrimestral Sep–Dic ${año}` },
    ]
    cuatDates.forEach(o => obs.push({
      tipo: 'IVA_CUATRIMESTRAL',
      label: o.label,
      fecha: addDias(o.base, d),
      descripcion: 'Declaración y pago IVA cuatrimestral',
    }))

    // Declaración anual SIMPLE (octubre)
    obs.push({
      tipo: 'SIMPLE_ANUAL',
      label: `Declaración anual SIMPLE ${año}`,
      fecha: addDias(`${año}-10-06`, d),
      descripcion: 'Declaración anual del impuesto unificado bajo Régimen SIMPLE',
    })
  } else {
    // IVA bimestral
    const bimDates = [
      { base: `${año}-03-09`,     label: `IVA bimestral Ene–Feb ${año}` },
      { base: `${año}-05-11`,     label: `IVA bimestral Mar–Abr ${año}` },
      { base: `${año}-07-09`,     label: `IVA bimestral May–Jun ${año}` },
      { base: `${año}-09-09`,     label: `IVA bimestral Jul–Ago ${año}` },
      { base: `${año}-11-10`,     label: `IVA bimestral Sep–Oct ${año}` },
      { base: `${año + 1}-01-12`, label: `IVA bimestral Nov–Dic ${año}` },
    ]
    bimDates.forEach(o => obs.push({
      tipo: 'IVA_BIMESTRAL',
      label: o.label,
      fecha: addDias(o.base, d),
      descripcion: 'Declaración y pago IVA bimestral (régimen ordinario)',
    }))

    // Retención en la fuente (mensual)
    for (let m = 0; m < 12; m++) {
      const mesVence = new Date(año, m + 1, 10)
      const mesNombre = new Date(año, m, 1).toLocaleString('es-CO', { month: 'long' })
      obs.push({
        tipo: 'RETENCION',
        label: `Retención en la fuente ${mesNombre} ${año}`,
        fecha: addDias(mesVence.toISOString().split('T')[0], d),
        descripcion: 'Declaración y pago retención en la fuente mensual',
      })
    }

    // Renta año anterior (pagada en el año actual)
    obs.push({
      tipo: 'RENTA',
      label: `Renta año gravable ${año - 1}`,
      fecha: addDias(`${año}-04-12`, d),
      descripcion: `Declaración de renta y complementarios año gravable ${año - 1}`,
    })
  }

  // Renta del año en curso (pagada el año siguiente)
  obs.push({
    tipo: 'RENTA',
    label: `Renta año gravable ${año}`,
    fecha: addDias(`${año + 1}-04-12`, d),
    descripcion: `Declaración de renta y complementarios año gravable ${año}`,
  })

  return obs
}

// ── Colores e íconos por tipo ─────────────────────────────────────────────────
const META = {
  IVA_BIMESTRAL:    { color: 'accent',  emoji: '📋', corto: 'IVA Bim.' },
  IVA_CUATRIMESTRAL:{ color: 'info',    emoji: '📋', corto: 'IVA Cuat.' },
  RETENCION:        { color: 'warning', emoji: '💰', corto: 'Retención' },
  RENTA:            { color: 'danger',  emoji: '🏦', corto: 'Renta' },
  SIMPLE_ANUAL:     { color: 'success', emoji: '📑', corto: 'SIMPLE' },
}

// ── GET /api/vencimientos ─────────────────────────────────────────────────────
const listar = async (req, res) => {
  const empresa_id = req.user.empresa_id
  const hoy = new Date()
  const año = hoy.getFullYear()

  try {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('nit, regimen')
      .eq('id', empresa_id)
      .single()

    const nitNumeros = (empresa?.nit || '0').replace(/[^0-9]/g, '')
    const digito     = parseInt(nitNumeros.slice(-1)) || 0
    const regimen    = empresa?.regimen || 'ORDINARIO'

    const todas = calcularObligaciones(año, digito, regimen)

    const VENTANA_PASADO  = -7   // muestra hasta 7 días vencidos
    const VENTANA_FUTURO  = 120  // muestra los próximos 120 días

    const resultado = todas
      .map(o => {
        const dias = Math.ceil((new Date(o.fecha + 'T12:00:00') - hoy) / 86400000)
        const meta = META[o.tipo] || {}
        return {
          ...o,
          dias_restantes: dias,
          urgencia:
            dias < 0  ? 'VENCIDA' :
            dias <= 7 ? 'CRITICA' :
            dias <= 15 ? 'ALTA'   :
            dias <= 30 ? 'MEDIA'  : 'BAJA',
          color:  meta.color  || 'neutral',
          emoji:  meta.emoji  || '📌',
          corto:  meta.corto  || o.tipo,
        }
      })
      .filter(o => o.dias_restantes >= VENTANA_PASADO && o.dias_restantes <= VENTANA_FUTURO)
      .sort((a, b) => a.dias_restantes - b.dias_restantes)

    res.json({
      vencimientos: resultado,
      nit_digito: digito,
      regimen,
      total: resultado.length,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { listar }
