const supabase = require('../config/db')

// GET /api/caja-menor — Lista movimientos con filtros
const listar = async (req, res) => {
  try {
    const { desde, hasta, tipo, limit = 100, offset = 0 } = req.query
    const empresa_id = req.user.empresa_id

    let q = supabase
      .from('caja_menor')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresa_id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(+offset, +offset + +limit - 1)

    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    if (tipo)  q = q.eq('tipo', tipo)

    const { data, error, count } = await q
    if (error) return res.status(500).json({ error: error.message })

    res.json({ movimientos: data || [], total: count || 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/caja-menor/resumen — Saldo actual + totales por tipo
const resumen = async (req, res) => {
  try {
    const { desde, hasta } = req.query
    const empresa_id = req.user.empresa_id

    let q = supabase
      .from('caja_menor')
      .select('tipo, monto')
      .eq('empresa_id', empresa_id)

    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })

    const ingresos = data.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + (m.monto || 0), 0)
    const egresos  = data.filter(m => m.tipo === 'EGRESO').reduce((s, m) => s + (m.monto || 0), 0)
    const saldo    = ingresos - egresos
    const num_movimientos = data.length

    res.json({ ingresos, egresos, saldo, num_movimientos })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/caja-menor — Registrar movimiento
const crear = async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id
    const { tipo, fecha, descripcion, categoria, monto, comprobante, responsable, notas } = req.body

    if (!tipo || !descripcion || !monto || monto <= 0) {
      return res.status(400).json({ error: 'Faltan campos requeridos (tipo, descripcion, monto)' })
    }

    const { data, error } = await supabase
      .from('caja_menor')
      .insert({ empresa_id, tipo, fecha: fecha || new Date().toISOString().split('T')[0], descripcion, categoria: categoria || 'VARIOS', monto: +monto, comprobante, responsable, notas })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PUT /api/caja-menor/:id — Actualizar movimiento
const actualizar = async (req, res) => {
  try {
    const { id } = req.params
    const empresa_id = req.user.empresa_id
    const { tipo, fecha, descripcion, categoria, monto, comprobante, responsable, notas } = req.body

    const { data, error } = await supabase
      .from('caja_menor')
      .update({ tipo, fecha, descripcion, categoria, monto: +monto, comprobante, responsable, notas })
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/caja-menor/:id — Eliminar movimiento
const eliminar = async (req, res) => {
  try {
    const { error } = await supabase
      .from('caja_menor')
      .delete()
      .eq('id', req.params.id)
      .eq('empresa_id', req.user.empresa_id)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { listar, resumen, crear, actualizar, eliminar }
