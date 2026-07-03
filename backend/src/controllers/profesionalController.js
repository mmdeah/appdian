const supabase = require('../config/db')

// ── GET /api/profesional/tickets — Todos los tickets del panel ────────────────
const listarTickets = async (req, res) => {
  const { estado, tipo, urgencia } = req.query
  try {
    let q = supabase
      .from('tickets')
      .select('*, empresas(nombre, nit, email, telefono), profesionales(nombre, especialidad)')
      .order('updated_at', { ascending: false })

    if (estado)   q = q.eq('estado', estado)
    if (tipo)     q = q.eq('tipo', tipo)
    if (urgencia) q = q.eq('urgencia', urgencia)

    const { data, error } = await q
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/profesional/tickets/:id — Detalle completo ──────────────────────
const obtenerTicket = async (req, res) => {
  try {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*, empresas(nombre, nit, email, telefono, direccion), profesionales(nombre, especialidad)')
      .eq('id', req.params.id)
      .single()
    if (error) return res.status(404).json({ error: 'Ticket no encontrado' })

    const { data: mensajes } = await supabase
      .from('ticket_mensajes')
      .select('*')
      .eq('ticket_id', req.params.id)
      .order('created_at', { ascending: true })

    res.json({ ...ticket, mensajes: mensajes || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── PATCH /api/profesional/tickets/:id — Cambiar estado / asignar ─────────────
const actualizarTicket = async (req, res) => {
  const { estado, asignado_a, urgencia } = req.body
  try {
    const updates = { updated_at: new Date().toISOString() }
    if (estado)     updates.estado = estado
    if (asignado_a !== undefined) updates.asignado_a = asignado_a
    if (urgencia)   updates.urgencia = urgencia
    if (estado === 'COMPLETADO') updates.completado_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, empresas(nombre, nit), profesionales(nombre)')
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/profesional/tickets/:id/mensajes — Profesional responde ─────────
const enviarMensaje = async (req, res) => {
  const { contenido, es_interno } = req.body
  const profesional_id = req.user.profesional_id
  try {
    const { data: prof } = await supabase
      .from('profesionales').select('nombre').eq('id', profesional_id).single()

    const { data, error } = await supabase
      .from('ticket_mensajes')
      .insert({
        ticket_id: req.params.id,
        autor_nombre: prof?.nombre || 'Profesional',
        autor_tipo: 'PROFESIONAL',
        contenido,
        es_interno: es_interno || false,
      })
      .select().single()
    if (error) throw error

    await supabase.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id)
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/profesional/empresa/:id/resumen — Info de empresa para profesional
const resumenEmpresa = async (req, res) => {
  const empresa_id = req.params.id
  try {
    const [empRes, facRes, statsRes] = await Promise.all([
      supabase.from('empresas').select('nombre, nit, email, telefono, direccion').eq('id', empresa_id).single(),
      supabase.from('facturas').select('tipo, estado, total, created_at, cliente_nombre')
        .eq('empresa_id', empresa_id).order('created_at', { ascending: false }).limit(10),
      supabase.from('facturas').select('total, iva').eq('empresa_id', empresa_id).eq('estado', 'APROBADA'),
    ])

    const stats = statsRes.data || []
    res.json({
      empresa:         empRes.data,
      facturas_recientes: facRes.data || [],
      resumen: {
        total_ventas:  stats.reduce((a, f) => a + (f.total || 0), 0),
        total_iva:     stats.reduce((a, f) => a + (f.iva || 0), 0),
        num_facturas:  stats.length,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/profesional/profesionales — Lista del equipo ─────────────────────
const listarProfesionales = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profesionales').select('id, nombre, especialidad, activo').eq('activo', true)
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { listarTickets, obtenerTicket, actualizarTicket, enviarMensaje, resumenEmpresa, listarProfesionales }
