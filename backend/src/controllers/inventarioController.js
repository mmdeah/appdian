const supabase = require('../config/db')

// GET /api/inventario — Lista de productos
const listar = async (req, res) => {
  try {
    const { q, categoria, bajo_stock } = req.query
    const empresa_id = req.user.empresa_id

    let query = supabase
      .from('inventario')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (q)         query = query.ilike('nombre', `%${q}%`)
    if (categoria) query = query.eq('categoria', categoria)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    let productos = data || []
    if (bajo_stock === 'true') {
      productos = productos.filter(p => p.stock_actual <= p.stock_minimo)
    }

    res.json({ productos })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/inventario/resumen — KPIs de inventario
const resumen = async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id
    const { data, error } = await supabase
      .from('inventario')
      .select('stock_actual, stock_minimo, precio_costo, precio_venta')
      .eq('empresa_id', empresa_id)
      .eq('activo', true)

    if (error) return res.status(500).json({ error: error.message })

    const total_productos  = (data || []).length
    const bajo_stock       = (data || []).filter(p => p.stock_actual <= p.stock_minimo).length
    const sin_stock        = (data || []).filter(p => p.stock_actual <= 0).length
    const valor_costo      = (data || []).reduce((s, p) => s + (p.stock_actual * p.precio_costo), 0)
    const valor_venta      = (data || []).reduce((s, p) => s + (p.stock_actual * p.precio_venta), 0)

    res.json({ total_productos, bajo_stock, sin_stock, valor_costo, valor_venta })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/inventario — Crear producto
const crear = async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id
    const { codigo, nombre, descripcion, categoria, unidad, precio_costo, precio_venta, stock_actual, stock_minimo } = req.body

    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })

    const { data, error } = await supabase
      .from('inventario')
      .insert({
        empresa_id, codigo, nombre, descripcion,
        categoria:    categoria    || 'GENERAL',
        unidad:       unidad       || 'UND',
        precio_costo: +(precio_costo || 0),
        precio_venta: +(precio_venta || 0),
        stock_actual: +(stock_actual || 0),
        stock_minimo: +(stock_minimo || 0),
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PUT /api/inventario/:id — Actualizar producto
const actualizar = async (req, res) => {
  try {
    const { id } = req.params
    const empresa_id = req.user.empresa_id
    const { codigo, nombre, descripcion, categoria, unidad, precio_costo, precio_venta, stock_minimo } = req.body

    const { data, error } = await supabase
      .from('inventario')
      .update({ codigo, nombre, descripcion, categoria, unidad, precio_costo: +(precio_costo || 0), precio_venta: +(precio_venta || 0), stock_minimo: +(stock_minimo || 0), updated_at: new Date().toISOString() })
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

// DELETE /api/inventario/:id — Desactivar producto (soft delete)
const desactivar = async (req, res) => {
  try {
    const { error } = await supabase
      .from('inventario')
      .update({ activo: false })
      .eq('id', req.params.id)
      .eq('empresa_id', req.user.empresa_id)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/inventario/:id/movimiento — Registrar entrada/salida/ajuste
const movimiento = async (req, res) => {
  try {
    const { id } = req.params
    const empresa_id = req.user.empresa_id
    const { tipo, cantidad, precio_unitario, motivo, referencia } = req.body

    if (!tipo || !cantidad || +cantidad <= 0) {
      return res.status(400).json({ error: 'tipo y cantidad positiva son requeridos' })
    }

    // Obtener producto actual
    const { data: prod, error: pe } = await supabase
      .from('inventario')
      .select('stock_actual')
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single()

    if (pe || !prod) return res.status(404).json({ error: 'Producto no encontrado' })

    // Calcular nuevo stock
    let nuevo_stock = prod.stock_actual
    if (tipo === 'ENTRADA')   nuevo_stock += +cantidad
    else if (tipo === 'SALIDA')   nuevo_stock -= +cantidad
    else if (tipo === 'AJUSTE')   nuevo_stock  = +cantidad

    if (nuevo_stock < 0) return res.status(400).json({ error: 'Stock insuficiente para esta salida' })

    // Registrar movimiento
    const { error: me } = await supabase
      .from('movimientos_inventario')
      .insert({ empresa_id, producto_id: id, tipo, cantidad: +cantidad, precio_unitario: precio_unitario ? +precio_unitario : null, motivo, referencia })

    if (me) return res.status(500).json({ error: me.message })

    // Actualizar stock
    const { data, error: ue } = await supabase
      .from('inventario')
      .update({ stock_actual: nuevo_stock, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single()

    if (ue) return res.status(500).json({ error: ue.message })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/inventario/:id/movimientos — Historial de movimientos
const movimientos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('producto_id', req.params.id)
      .eq('empresa_id', req.user.empresa_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ movimientos: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { listar, resumen, crear, actualizar, desactivar, movimiento, movimientos }
