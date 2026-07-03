const supabase = require('../config/db')
const audit   = require('../services/auditService')

// ── POST /api/tickets — Empresa crea un ticket ────────────────────────────────
const crear = async (req, res) => {
  const { tipo, asunto, descripcion, urgencia } = req.body
  const empresa_id = req.user.empresa_id
  try {
    const { data, error } = await supabase
      .from('tickets')
      .insert({ empresa_id, tipo, asunto, descripcion, urgencia: urgencia || 'MEDIA' })
      .select('*, profesionales(nombre, especialidad)')
      .single()
    if (error) throw error
    audit.log({ tipo: 'TICKET_CREADO', descripcion: `Ticket creado: "${asunto}" (tipo: ${tipo}, urgencia: ${urgencia || 'MEDIA'})`, empresa_id })
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/tickets — Lista tickets de la empresa ────────────────────────────
const listar = async (req, res) => {
  const empresa_id = req.user.empresa_id
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, profesionales(nombre, especialidad)')
      .eq('empresa_id', empresa_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/tickets/:id — Detalle de un ticket (empresa) ─────────────────────
const obtener = async (req, res) => {
  const empresa_id = req.user.empresa_id
  try {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*, profesionales(nombre, especialidad)')
      .eq('id', req.params.id)
      .eq('empresa_id', empresa_id)
      .single()
    if (error) return res.status(404).json({ error: 'Ticket no encontrado' })

    const { data: mensajes } = await supabase
      .from('ticket_mensajes')
      .select('*')
      .eq('ticket_id', req.params.id)
      .eq('es_interno', false)
      .order('created_at', { ascending: true })

    const { data: archivos } = await supabase
      .from('ticket_archivos')
      .select('*')
      .eq('ticket_id', req.params.id)
      .order('created_at', { ascending: true })

    res.json({ ...ticket, mensajes: mensajes || [], archivos: archivos || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/tickets/:id/mensajes — Empresa responde en el ticket ────────────
const enviarMensaje = async (req, res) => {
  const { contenido } = req.body
  const empresa_id   = req.user.empresa_id
  try {
    const { data: ticket } = await supabase
      .from('tickets').select('id, empresa_id')
      .eq('id', req.params.id).eq('empresa_id', empresa_id).single()
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

    const { data: empresa } = await supabase
      .from('empresas').select('nombre').eq('id', empresa_id).single()

    const { data, error } = await supabase
      .from('ticket_mensajes')
      .insert({
        ticket_id: req.params.id,
        autor_nombre: empresa?.nombre || 'Empresa',
        autor_tipo: 'EMPRESA',
        contenido,
        es_interno: false,
      })
      .select().single()

    if (error) throw error

    await supabase.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id)
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Sanitiza nombres de archivo: quita tildes y caracteres especiales
function sanitizarNombreArchivo(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // quitar tildes/acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_') // reemplazar todo lo demás con _
    .replace(/_+/g, '_')               // colapsar underscores múltiples
    .replace(/^_|_$/g, '')             // quitar _ al inicio/fin
}

// ── POST /api/tickets/:id/archivos — Subir archivo adjunto ───────────────────
const subirArchivo = async (req, res) => {
  const ticket_id  = req.params.id
  // Funciona para EMPRESA (verifica dueño) y PROFESIONAL (acceso libre al ticket)
  const empresa_id = req.user.empresa_id || null

  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

  try {
    // Verificar acceso al ticket
    let q = supabase.from('tickets').select('id, empresa_id').eq('id', ticket_id)
    if (empresa_id) q = q.eq('empresa_id', empresa_id)
    const { data: ticket } = await q.single()
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' })

    const nombreSanitizado = sanitizarNombreArchivo(req.file.originalname)
    const fileName = `${ticket_id}/${Date.now()}-${nombreSanitizado}`

    // Subir a Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('ticket-archivos')
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false })

    if (storageError) throw storageError

    // URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('ticket-archivos')
      .getPublicUrl(fileName)

    // Guardar referencia en BD
    const { data, error } = await supabase
      .from('ticket_archivos')
      .insert({
        ticket_id,
        nombre_original: req.file.originalname,
        url: publicUrl,
        tipo_mime: req.file.mimetype,
        tamanio: req.file.size,
      })
      .select().single()

    if (error) throw error

    await supabase.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticket_id)
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { crear, listar, obtener, enviarMensaje, subirArchivo }
