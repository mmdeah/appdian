const supabase = require('../config/db')
const audit   = require('../services/auditService')

const SERVICIO_UNIDADES = ['SRV','SERV','HORA','HRS','HR','MIN','CONS','MES','DIA','DÍA']
const esServicio = u => SERVICIO_UNIDADES.includes((u || '').toUpperCase())

// GET /api/products
const listar = async (req, res) => {
  const { search } = req.query
  let query = supabase
    .from('productos')
    .select('*')
    .eq('empresa_id', req.user.empresa_id)
    .eq('activo', true)
    .order('nombre')

  if (search) {
    query = query.or(`nombre.ilike.%${search}%,codigo.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ productos: data })
}

// GET /api/products/:id
const obtener = async (req, res) => {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('id', req.params.id)
    .eq('empresa_id', req.user.empresa_id)
    .single()

  if (error) return res.status(404).json({ error: 'Producto no encontrado' })
  res.json(data)
}

// POST /api/products
const crear = async (req, res) => {
  const { codigo, nombre, descripcion, precio, iva_porcentaje, unidad, activo,
          stock_actual, stock_minimo, precio_costo, categoria } = req.body

  const unidadFinal = unidad || 'UND'
  const esServ = esServicio(unidadFinal)

  const { data, error } = await supabase
    .from('productos')
    .insert({
      empresa_id    : req.user.empresa_id,
      codigo,
      nombre,
      descripcion,
      precio        : +(precio || 0),
      iva_porcentaje: +(iva_porcentaje ?? 19),
      unidad        : unidadFinal,
      activo        : activo ?? true,
      categoria     : categoria || (esServ ? 'SERVICIO' : 'GENERAL'),
      precio_costo  : +(precio_costo || 0),
      stock_actual  : esServ ? 0 : +(stock_actual || 0),
      stock_minimo  : esServ ? 0 : +(stock_minimo || 0),
    })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  audit.log({
    tipo       : 'PRODUCTO_CREADO',
    descripcion: `Producto creado: "${data.nombre}" (cód. ${data.codigo || 'N/A'}) a $${data.precio}`,
    empresa_id : req.user.empresa_id,
  })
  res.status(201).json(data)
}

// PUT /api/products/:id
const actualizar = async (req, res) => {
  const { codigo, nombre, descripcion, precio, iva_porcentaje, unidad, activo,
          stock_actual, stock_minimo, precio_costo, categoria } = req.body

  const unidadFinal = unidad || 'UND'
  const esServ = esServicio(unidadFinal)

  const { data, error } = await supabase
    .from('productos')
    .update({
      codigo,
      nombre,
      descripcion,
      precio        : precio !== undefined ? +(precio) : undefined,
      iva_porcentaje: iva_porcentaje !== undefined ? +(iva_porcentaje) : undefined,
      unidad        : unidadFinal,
      activo,
      categoria     : categoria || undefined,
      precio_costo  : precio_costo !== undefined ? +(precio_costo) : undefined,
      stock_actual  : (!esServ && stock_actual !== undefined) ? +(stock_actual) : undefined,
      stock_minimo  : (!esServ && stock_minimo !== undefined) ? +(stock_minimo) : undefined,
    })
    .eq('id', req.params.id)
    .eq('empresa_id', req.user.empresa_id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  audit.log({
    tipo       : 'PRODUCTO_EDITADO',
    descripcion: `Producto editado: "${data.nombre}" (id: ${data.id})`,
    empresa_id : req.user.empresa_id,
  })
  res.json(data)
}

// DELETE /api/products/:id (soft delete)
const eliminar = async (req, res) => {
  const { error } = await supabase
    .from('productos')
    .update({ activo: false })
    .eq('id', req.params.id)
    .eq('empresa_id', req.user.empresa_id)

  if (error) return res.status(400).json({ error: error.message })
  audit.log({
    tipo       : 'PRODUCTO_ELIMINADO',
    descripcion: `Producto eliminado (id: ${req.params.id})`,
    empresa_id : req.user.empresa_id,
  })
  res.json({ ok: true })
}

module.exports = { listar, obtener, crear, actualizar, eliminar }
