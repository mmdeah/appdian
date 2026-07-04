const supabase = require('../config/db')

// Unidades que indican servicio (sin stock físico)
const SERVICIO_UNIDADES = ['SRV','SERV','HORA','HRS','HR','MIN','CONS','MES','DIA','DÍA']
const esServicio = u => SERVICIO_UNIDADES.includes((u || '').toUpperCase())

// GET /api/inventario
const listar = async (req, res) => {
  try {
    const { q, categoria, bajo_stock } = req.query
    const empresa_id = req.user.empresa_id

    let query = supabase
      .from('productos')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (q)         query = query.ilike('nombre', `%${q}%`)
    if (categoria) query = query.eq('categoria', categoria)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    // Filtrar servicios en JS (más seguro con caracteres especiales)
    let productos = (data || []).filter(p => !esServicio(p.unidad))

    if (bajo_stock === 'true') {
      productos = productos.filter(p => p.stock_actual <= p.stock_minimo)
    }

    res.json({ productos })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/inventario/resumen
const resumen = async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id
    const { data, error } = await supabase
      .from('productos')
      .select('stock_actual, stock_minimo, precio_costo, precio, unidad')
      .eq('empresa_id', empresa_id)
      .eq('activo', true)

    if (error) return res.status(500).json({ error: error.message })

    const items = (data || []).filter(p => !esServicio(p.unidad))

    res.json({
      total_productos : items.length,
      bajo_stock      : items.filter(p => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo).length,
      sin_stock       : items.filter(p => p.stock_actual <= 0).length,
      valor_costo     : items.reduce((s, p) => s + (p.stock_actual * (p.precio_costo || 0)), 0),
      valor_venta     : items.reduce((s, p) => s + (p.stock_actual * (p.precio || 0)), 0),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/inventario  — crea un producto físico (no servicio)
const crear = async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id
    const { codigo, nombre, descripcion, categoria, unidad, precio_costo, precio_venta, precio, stock_actual, stock_minimo, iva_porcentaje } = req.body

    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' })

    const unidadFinal = unidad || 'UND'
    if (esServicio(unidadFinal)) {
      return res.status(400).json({ error: 'Use la sección Productos para crear servicios' })
    }

    const { data, error } = await supabase
      .from('productos')
      .insert({
        empresa_id,
        codigo,
        nombre,
        descripcion,
        categoria    : categoria    || 'GENERAL',
        unidad       : unidadFinal,
        precio_costo : +(precio_costo || 0),
        precio       : +(precio_venta || precio || 0),
        iva_porcentaje: +(iva_porcentaje ?? 19),
        stock_actual : +(stock_actual || 0),
        stock_minimo : +(stock_minimo || 0),
        activo       : true,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PUT /api/inventario/:id
const actualizar = async (req, res) => {
  try {
    const { id } = req.params
    const empresa_id = req.user.empresa_id
    const { codigo, nombre, descripcion, categoria, unidad, precio_costo, precio_venta, precio, stock_minimo, iva_porcentaje } = req.body

    const { data, error } = await supabase
      .from('productos')
      .update({
        codigo,
        nombre,
        descripcion,
        categoria,
        unidad,
        precio_costo : +(precio_costo || 0),
        precio       : +(precio_venta || precio || 0),
        iva_porcentaje: iva_porcentaje !== undefined ? +iva_porcentaje : undefined,
        stock_minimo : +(stock_minimo || 0),
        updated_at   : new Date().toISOString(),
      })
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

// DELETE /api/inventario/:id — soft delete
const desactivar = async (req, res) => {
  try {
    const { error } = await supabase
      .from('productos')
      .update({ activo: false })
      .eq('id', req.params.id)
      .eq('empresa_id', req.user.empresa_id)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/inventario/:id/movimiento
const movimiento = async (req, res) => {
  try {
    const { id } = req.params
    const empresa_id = req.user.empresa_id
    const { tipo, cantidad, precio_unitario, motivo, referencia } = req.body

    if (!tipo || !cantidad || +cantidad <= 0) {
      return res.status(400).json({ error: 'tipo y cantidad positiva son requeridos' })
    }

    const { data: prod, error: pe } = await supabase
      .from('productos')
      .select('stock_actual, unidad, nombre')
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single()

    if (pe || !prod) return res.status(404).json({ error: 'Producto no encontrado' })
    if (esServicio(prod.unidad)) return res.status(400).json({ error: 'Los servicios no tienen stock' })

    let nuevo_stock = prod.stock_actual
    if      (tipo === 'ENTRADA') nuevo_stock += +cantidad
    else if (tipo === 'SALIDA')  nuevo_stock -= +cantidad
    else if (tipo === 'AJUSTE')  nuevo_stock  = +cantidad

    if (nuevo_stock < 0) return res.status(400).json({ error: 'Stock insuficiente para esta salida' })

    const { error: me } = await supabase
      .from('movimientos_inventario')
      .insert({
        empresa_id,
        producto_id     : id,
        tipo,
        cantidad        : +cantidad,
        precio_unitario : precio_unitario ? +precio_unitario : null,
        motivo,
        referencia,
      })

    if (me) return res.status(500).json({ error: me.message })

    const { data, error: ue } = await supabase
      .from('productos')
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

// GET /api/inventario/:id/movimientos
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
