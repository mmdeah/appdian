const supabase = require('../config/db')

const round2 = (n) => Math.round((n || 0) * 100) / 100

// ── GET /api/cotizaciones ──────────────────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id
    const { estado, desde, hasta } = req.query

    let q = supabase
      .from('cotizaciones')
      .select('id, numero_cotizacion, cliente_nombre, cliente_nit, subtotal, iva, total, estado, validez_dias, created_at')
      .eq('empresa_id', empresa_id)
      .order('created_at', { ascending: false })

    if (estado) q = q.eq('estado', estado)
    if (desde)  q = q.gte('created_at', `${desde}T00:00:00`)
    if (hasta)  q = q.lte('created_at', `${hasta}T23:59:59`)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    res.json({ cotizaciones: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// ── GET /api/cotizaciones/:id ──────────────────────────────────────────────────
const obtener = async (req, res) => {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('*, items_cotizacion(*)')
    .eq('id', req.params.id)
    .eq('empresa_id', req.user.empresa_id)
    .single()

  if (error) return res.status(404).json({ error: 'Cotización no encontrada' })
  res.json(data)
}

// ── POST /api/cotizaciones ─────────────────────────────────────────────────────
const crear = async (req, res) => {
  try {
    const empresa_id = req.user.empresa_id
    const {
      cliente_nombre, cliente_nit, cliente_email, cliente_telefono,
      validez_dias, notas, items,
    } = req.body

    if (!items || items.length === 0)
      return res.status(400).json({ error: 'Debe agregar al menos un ítem' })

    // Siguiente número para esta empresa
    const { data: last } = await supabase
      .from('cotizaciones')
      .select('numero_cotizacion')
      .eq('empresa_id', empresa_id)
      .order('numero_cotizacion', { ascending: false })
      .limit(1)
      .maybeSingle()

    const numero_cotizacion = (last?.numero_cotizacion || 0) + 1

    // Calcular totales
    let subtotal = 0, iva = 0
    const itemsCalc = items.map(it => {
      const cant  = parseFloat(it.cantidad)        || 0
      const precio = parseFloat(it.precio_unitario) || 0
      const ivaPct = parseFloat(it.iva_porcentaje)  || 0
      const sub   = round2(cant * precio)
      subtotal   += sub
      iva        += sub * ivaPct / 100
      return {
        descripcion     : String(it.descripcion || '').trim(),
        cantidad        : cant,
        precio_unitario : precio,
        iva_porcentaje  : ivaPct,
        subtotal        : sub,
      }
    })
    subtotal = round2(subtotal)
    iva      = round2(iva)
    const total = round2(subtotal + iva)

    // Insertar cabecera
    const { data: cot, error: cotErr } = await supabase
      .from('cotizaciones')
      .insert({
        empresa_id,
        numero_cotizacion,
        cliente_nombre   : cliente_nombre?.trim() || 'Consumidor Final',
        cliente_nit      : cliente_nit?.trim()    || null,
        cliente_email    : cliente_email?.trim()  || null,
        cliente_telefono : cliente_telefono?.trim() || null,
        validez_dias     : parseInt(validez_dias) || 30,
        notas            : notas?.trim() || null,
        subtotal, iva, total,
      })
      .select()
      .single()

    if (cotErr) return res.status(500).json({ error: cotErr.message })

    // Insertar ítems
    const { error: itmErr } = await supabase
      .from('items_cotizacion')
      .insert(itemsCalc.map(it => ({ ...it, cotizacion_id: cot.id })))

    if (itmErr) return res.status(500).json({ error: itmErr.message })

    res.status(201).json({ ...cot, items_cotizacion: itemsCalc.map(it => ({ ...it, cotizacion_id: cot.id })) })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// ── PATCH /api/cotizaciones/:id/estado ────────────────────────────────────────
const cambiarEstado = async (req, res) => {
  try {
    const VALIDOS = ['BORRADOR','ENVIADA','ACEPTADA','RECHAZADA','VENCIDA']
    const { estado } = req.body
    if (!VALIDOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido' })

    const { data, error } = await supabase
      .from('cotizaciones')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('empresa_id', req.user.empresa_id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// ── DELETE /api/cotizaciones/:id ──────────────────────────────────────────────
const eliminar = async (req, res) => {
  const { error } = await supabase
    .from('cotizaciones')
    .delete()
    .eq('id', req.params.id)
    .eq('empresa_id', req.user.empresa_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}

module.exports = { listar, obtener, crear, cambiarEstado, eliminar }
