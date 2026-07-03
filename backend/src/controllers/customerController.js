const supabase = require('../config/db')
const audit   = require('../services/auditService')

// GET /api/customers
const listar = async (req, res) => {
  const { search } = req.query
  let query = supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', req.user.empresa_id)
    .order('nombre')

  if (search) {
    query = query.or(`nombre.ilike.%${search}%,nit.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ clientes: data })
}

// POST /api/customers
const crear = async (req, res) => {
  const { nombre, nit, email, telefono, direccion, ciudad_id, tipo_doc_id, tipo_organizacion_id, regimen_fiscal_id } = req.body

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      empresa_id: req.user.empresa_id,
      nombre,
      nit,
      email,
      telefono,
      direccion,
      ciudad_id: ciudad_id || 836,
      tipo_doc_id: tipo_doc_id || 3,
      tipo_organizacion_id: tipo_organizacion_id || 2,
      regimen_fiscal_id: regimen_fiscal_id || 2
    })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  audit.log({ tipo: 'CLIENTE_CREADO', descripcion: `Cliente creado: "${data.nombre}" (NIT/CC: ${data.nit})`, empresa_id: req.user.empresa_id })
  res.status(201).json(data)
}

// PUT /api/customers/:id
const actualizar = async (req, res) => {
  const campos = req.body

  const { data, error } = await supabase
    .from('clientes')
    .update(campos)
    .eq('id', req.params.id)
    .eq('empresa_id', req.user.empresa_id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  audit.log({ tipo: 'CLIENTE_EDITADO', descripcion: `Cliente editado: "${data.nombre}" (id: ${data.id})`, empresa_id: req.user.empresa_id })
  res.json(data)
}

// DELETE /api/customers/:id
const eliminar = async (req, res) => {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', req.params.id)
    .eq('empresa_id', req.user.empresa_id)

  if (error) return res.status(400).json({ error: error.message })
  audit.log({ tipo: 'CLIENTE_ELIMINADO', descripcion: `Cliente eliminado (id: ${req.params.id})`, empresa_id: req.user.empresa_id })
  res.json({ ok: true })
}

module.exports = { listar, crear, actualizar, eliminar }
