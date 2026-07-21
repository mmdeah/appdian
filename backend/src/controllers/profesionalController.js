const supabase = require('../config/db')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const { descifrar } = require('../services/cifradoService')
const audit    = require('../services/auditService')

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

    if (estado === 'COMPLETADO') {
      audit.log({
        tipo: 'TICKET_COMPLETADO',
        descripcion: `Ticket #${req.params.id.slice(0,8)} marcado como completado por profesional`,
        empresa_id: data.empresa_id,
        profesional_id: req.user.profesional_id,
      })
    }
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

// ── GET /api/profesional/empresa/:id/ver-password ─────────────────────────────
// Descifra y devuelve la contraseña de la empresa. Queda registrado en audit_log.
const verPasswordEmpresa = async (req, res) => {
  const empresa_id    = req.params.id
  const profesional_id = req.user.profesional_id
  try {
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('nombre, email, password_cifrada')
      .eq('id', empresa_id)
      .single()

    if (error || !empresa) return res.status(404).json({ error: 'Empresa no encontrada' })
    if (!empresa.password_cifrada) {
      return res.status(404).json({ error: 'Contraseña no disponible (cuenta creada antes del sistema de cifrado)' })
    }

    const password = descifrar(empresa.password_cifrada)

    // Registro obligatorio de auditoría
    await supabase.from('audit_log').insert({
      tipo:         'VER_PASSWORD',
      descripcion:  `Profesional consultó contraseña de empresa: ${empresa.nombre} (${empresa.email})`,
      profesional_id,
      empresa_id,
    })

    res.json({ email: empresa.email, password })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/profesional/empresas — Lista todas las empresas ─────────────────
const listarEmpresas = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre, nit, email, plan, activo, plan_pagado, plan_vence_en, plan_notas, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── PATCH /api/profesional/empresas/:id — Actualizar suscripción ─────────────
const actualizarEmpresa = async (req, res) => {
  const { id } = req.params
  const { plan, activo, plan_pagado, plan_vence_en, plan_notas } = req.body
  const campos = {}
  if (plan          !== undefined) campos.plan           = plan
  if (activo        !== undefined) campos.activo         = activo
  if (plan_pagado   !== undefined) campos.plan_pagado    = plan_pagado
  if (plan_vence_en !== undefined) campos.plan_vence_en  = plan_vence_en
  if (plan_notas    !== undefined) campos.plan_notas     = plan_notas
  try {
    const { error } = await supabase.from('empresas').update(campos).eq('id', id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/profesional/audit — Log de auditoría ────────────────────────────
const listarAudit = async (req, res) => {
  const { tipo, empresa_id, desde, hasta, limite = 100, offset = 0 } = req.query
  try {
    let q = supabase
      .from('audit_log')
      .select('*, empresas(nombre, nit, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(parseInt(limite))
      .range(parseInt(offset), parseInt(offset) + parseInt(limite) - 1)

    if (tipo)       q = q.eq('tipo', tipo)
    if (empresa_id) q = q.eq('empresa_id', empresa_id)
    if (desde)      q = q.gte('created_at', desde + 'T00:00:00')
    if (hasta)      q = q.lte('created_at', hasta + 'T23:59:59')

    const { data, error, count } = await q
    if (error) throw error
    res.json({ eventos: data || [], total: count || 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/profesional/empresa/:id/acceso — Token temporal de visor ────────
// Genera un JWT de 2h que permite al profesional ver la app como esa empresa.
const accesoEmpresa = async (req, res) => {
  const empresa_id     = req.params.id
  const profesional_id = req.user.profesional_id
  try {
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('id, nombre, nit, email')
      .eq('id', empresa_id)
      .single()

    if (error || !empresa) return res.status(404).json({ error: 'Empresa no encontrada' })

    const token = jwt.sign(
      { empresa_id: empresa.id, email: empresa.email, nit: empresa.nit, rol: 'EMPRESA', modo_visor: true, profesional_id },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    )

    audit.log({
      tipo: 'ACCESO_VISOR',
      descripcion: `Profesional accedió en modo visor a empresa: ${empresa.nombre} (${empresa.email})`,
      empresa_id,
      profesional_id,
    })

    res.json({ token, empresa })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { listarTickets, obtenerTicket, actualizarTicket, enviarMensaje, resumenEmpresa, listarProfesionales, verPasswordEmpresa, listarAudit, listarEmpresas, actualizarEmpresa, accesoEmpresa }
