const supabase = require('../config/db')
const audit    = require('../services/auditService')

const CATEGORIAS = [
  'NOMINA','ARRENDAMIENTO','SERVICIOS_PUBLICOS','MATERIA_PRIMA','MERCANCIA',
  'SERVICIOS_PROF','PUBLICIDAD','MANTENIMIENTO','VIATICOS','IMPUESTOS',
  'PAPELERIA','TECNOLOGIA','FINANCIERO','OTROS'
]

// GET /api/gastos?desde=&hasta=&categoria=&limit=&offset=
const listar = async (req, res) => {
  try {
    const { desde, hasta, categoria, limit = 100, offset = 0 } = req.query
    const empresa_id = req.user.empresa_id

    let q = supabase
      .from('gastos')
      .select('*', { count: 'exact' })
      .eq('empresa_id', empresa_id)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    if (desde)     q = q.gte('fecha', desde)
    if (hasta)     q = q.lte('fecha', hasta)
    if (categoria) q = q.eq('categoria', categoria)

    const { data, error, count } = await q
    if (error) return res.status(500).json({ error: error.message })

    res.json({ gastos: data || [], total: count || 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/gastos
const crear = async (req, res) => {
  try {
    const {
      categoria, subcategoria, proveedor, descripcion,
      monto, iva = 0, tipo_comprobante = 'FACTURA', numero_comprobante,
      fecha, medio_pago = 'TRANSFERENCIA', pagado = true, notas
    } = req.body

    if (!descripcion) return res.status(400).json({ error: 'descripcion requerida' })
    if (!categoria)   return res.status(400).json({ error: 'categoria requerida' })
    if (!monto || isNaN(monto)) return res.status(400).json({ error: 'monto inválido' })

    const { data, error } = await supabase
      .from('gastos')
      .insert({
        empresa_id: req.user.empresa_id,
        categoria,
        subcategoria,
        proveedor,
        descripcion,
        monto:  parseFloat(monto),
        iva:    parseFloat(iva),
        total:  parseFloat(monto) + parseFloat(iva),
        tipo_comprobante,
        numero_comprobante,
        fecha: fecha || new Date().toISOString().split('T')[0],
        medio_pago,
        pagado,
        notas
      })
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    audit.log({
      tipo: 'GASTO_CREADO',
      descripcion: `Gasto registrado: "${data.descripcion}" (${data.categoria}) — $${data.total?.toLocaleString('es-CO')}`,
      empresa_id: req.user.empresa_id
    })

    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PUT /api/gastos/:id
const actualizar = async (req, res) => {
  try {
    const campos = { ...req.body }
    if (campos.monto !== undefined) campos.monto = parseFloat(campos.monto)
    if (campos.iva   !== undefined) campos.iva   = parseFloat(campos.iva)
    // Recalcular total si cambia monto o iva
    if (campos.monto !== undefined || campos.iva !== undefined) {
      campos.total = (campos.monto || 0) + (campos.iva || 0)
    }

    const { data, error } = await supabase
      .from('gastos')
      .update(campos)
      .eq('id', req.params.id)
      .eq('empresa_id', req.user.empresa_id)
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })

    audit.log({
      tipo: 'GASTO_EDITADO',
      descripcion: `Gasto editado: "${data.descripcion}" (id: ${data.id})`,
      empresa_id: req.user.empresa_id
    })

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/gastos/:id
const eliminar = async (req, res) => {
  try {
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', req.params.id)
      .eq('empresa_id', req.user.empresa_id)

    if (error) return res.status(400).json({ error: error.message })

    audit.log({
      tipo: 'GASTO_ELIMINADO',
      descripcion: `Gasto eliminado (id: ${req.params.id})`,
      empresa_id: req.user.empresa_id
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/gastos/resumen?desde=&hasta=
const resumen = async (req, res) => {
  try {
    const { desde, hasta } = req.query
    const empresa_id = req.user.empresa_id

    let q = supabase
      .from('gastos')
      .select('categoria, monto, iva, total, fecha')
      .eq('empresa_id', empresa_id)

    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })

    const total_gastos = data.reduce((s, g) => s + (g.total || g.monto + g.iva), 0)
    const total_iva    = data.reduce((s, g) => s + (g.iva || 0), 0)
    const num_gastos   = data.length

    // Por categoría
    const por_categoria = {}
    for (const g of data) {
      const cat = g.categoria || 'OTROS'
      if (!por_categoria[cat]) por_categoria[cat] = 0
      por_categoria[cat] += (g.total || g.monto + g.iva)
    }

    const categorias = Object.entries(por_categoria)
      .sort(([, a], [, b]) => b - a)
      .map(([nombre, total]) => ({ nombre, total: Math.round(total) }))

    // Por mes (para gráfica flujo)
    const por_fecha = {}
    for (const g of data) {
      const key = g.fecha ? g.fecha.slice(0, 7) : 'otros'
      if (!por_fecha[key]) por_fecha[key] = 0
      por_fecha[key] += (g.total || g.monto + g.iva)
    }

    const serie = Object.entries(por_fecha)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({ fecha, total: Math.round(total) }))

    res.json({
      total_gastos: Math.round(total_gastos),
      total_iva:    Math.round(total_iva),
      num_gastos,
      categorias,
      serie,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/gastos/flujo?desde=&hasta=&agrupacion=
const flujo = async (req, res) => {
  try {
    const { desde, hasta, agrupacion = 'mes' } = req.query
    const empresa_id = req.user.empresa_id

    // Gastos en el período
    let qg = supabase.from('gastos').select('fecha, total, monto, iva').eq('empresa_id', empresa_id)
    if (desde) qg = qg.gte('fecha', desde)
    if (hasta) qg = qg.lte('fecha', hasta)
    const { data: gastosData } = await qg

    // Ingresos en el mismo período
    let qf = supabase.from('facturas').select('created_at, total')
      .eq('empresa_id', empresa_id)
      .in('estado', ['APROBADA', 'EMITIDA_LOCAL'])
    if (desde) qf = qf.gte('created_at', `${desde}T00:00:00`)
    if (hasta) qf = qf.lte('created_at', `${hasta}T23:59:59`)
    const { data: facturasData } = await qf

    function keyOf(dateStr) {
      const d = new Date(dateStr)
      if (agrupacion === 'dia')    return dateStr.slice(0, 10)
      if (agrupacion === 'semana') {
        const day = d.getDay() || 7
        const lunes = new Date(d)
        lunes.setDate(d.getDate() - day + 1)
        return lunes.toISOString().slice(0, 10)
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }

    const ingresos = {}
    const gastos   = {}

    for (const f of (facturasData || [])) {
      const k = keyOf(f.created_at)
      ingresos[k] = (ingresos[k] || 0) + (f.total || 0)
    }

    for (const g of (gastosData || [])) {
      const k = keyOf(g.fecha || new Date().toISOString())
      gastos[k] = (gastos[k] || 0) + (g.total || (g.monto + g.iva))
    }

    const keys = [...new Set([...Object.keys(ingresos), ...Object.keys(gastos)])].sort()
    const serie = keys.map(fecha => ({
      fecha,
      ingresos:  Math.round(ingresos[fecha] || 0),
      gastos:    Math.round(gastos[fecha] || 0),
      utilidad:  Math.round((ingresos[fecha] || 0) - (gastos[fecha] || 0)),
    }))

    res.json(serie)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { listar, crear, actualizar, eliminar, resumen, flujo }
