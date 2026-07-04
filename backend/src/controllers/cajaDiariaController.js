const supabase = require('../config/db')

const MEDIOS_PAGO = {
  10: 'Efectivo',
  42: 'Transferencia',
  49: 'Tarjeta débito',
  48: 'Tarjeta crédito',
  71: 'Bono / Vale',
}

// GET /api/caja-diaria?fecha=YYYY-MM-DD
const resumenDia = async (req, res) => {
  try {
    const fecha      = req.query.fecha || new Date().toISOString().split('T')[0]
    const empresa_id = req.user.empresa_id

    const { data, error } = await supabase
      .from('facturas')
      .select('tipo, estado, total, subtotal, iva, medio_pago_id')
      .eq('empresa_id', empresa_id)
      .gte('created_at', `${fecha}T00:00:00`)
      .lte('created_at', `${fecha}T23:59:59`)
      .in('estado', ['APROBADA', 'EMITIDA_LOCAL', 'PENDIENTE'])

    if (error) return res.status(500).json({ error: error.message })

    const facturas = data || []

    // Totales globales
    const total_ventas      = facturas.reduce((s, f) => s + (f.total    || 0), 0)
    const total_subtotal    = facturas.reduce((s, f) => s + (f.subtotal || 0), 0)
    const total_iva         = facturas.reduce((s, f) => s + (f.iva      || 0), 0)
    const num_transacciones = facturas.length

    // Por tipo de documento
    const pos = facturas.filter(f => f.tipo === 'POS')
    const fe  = facturas.filter(f => f.tipo === 'FE')
    const por_tipo = {
      POS: { count: pos.length, total: pos.reduce((s, f) => s + (f.total || 0), 0) },
      FE:  { count: fe.length,  total: fe.reduce((s, f)  => s + (f.total || 0), 0) },
    }

    // Por medio de pago
    const mapaMP = {}
    for (const f of facturas) {
      const id     = f.medio_pago_id || 10
      const nombre = MEDIOS_PAGO[id] || `Medio ${id}`
      if (!mapaMP[id]) mapaMP[id] = { id, nombre, count: 0, total: 0 }
      mapaMP[id].count++
      mapaMP[id].total += f.total || 0
    }
    const por_medio_pago = Object.values(mapaMP).sort((a, b) => b.total - a.total)

    // Efectivo en caja (solo ventas con medio_pago_id = 10)
    const efectivo_esperado = mapaMP[10]?.total || 0

    // ¿Ya tiene cierre registrado?
    const { data: cierreHoy } = await supabase
      .from('cierres_caja')
      .select('id, efectivo_contado, diferencia, cerrado_por, created_at')
      .eq('empresa_id', empresa_id)
      .eq('fecha', fecha)
      .maybeSingle()

    res.json({
      fecha,
      total_ventas,
      total_subtotal,
      total_iva,
      num_transacciones,
      efectivo_esperado,
      por_tipo,
      por_medio_pago,
      cierre: cierreHoy || null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/caja-diaria/historial
const historial = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cierres_caja')
      .select('*')
      .eq('empresa_id', req.user.empresa_id)
      .order('fecha', { ascending: false })
      .limit(60)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ cierres: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/caja-diaria/cierre
const registrarCierre = async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id
    const {
      fecha, total_ventas, total_iva, total_subtotal,
      efectivo_esperado, efectivo_contado,
      num_transacciones, notas, cerrado_por,
    } = req.body

    const diferencia = (+(efectivo_contado) || 0) - (+(efectivo_esperado) || 0)

    // Upsert por (empresa_id, fecha) — un solo cierre por día
    const { data, error } = await supabase
      .from('cierres_caja')
      .upsert({
        empresa_id,
        fecha,
        total_ventas:       +(total_ventas)       || 0,
        total_iva:          +(total_iva)           || 0,
        total_subtotal:     +(total_subtotal)      || 0,
        efectivo_esperado:  +(efectivo_esperado)   || 0,
        efectivo_contado:   +(efectivo_contado)    || 0,
        diferencia,
        num_transacciones:  +(num_transacciones)   || 0,
        notas,
        cerrado_por,
        created_at: new Date().toISOString(),
      }, { onConflict: 'empresa_id,fecha' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { resumenDia, historial, registrarCierre }
