const supabase = require('../config/db')
const { emitirDocumentoPOS, emitirFactura, consultarDocumento } = require('../services/matiasService')

// POST /api/invoices/pos — Emitir documento POS electrónico
const emitirPOS = async (req, res) => {
  const { items, cliente, cajero_nombre, terminal_numero, medio_pago_id, enviar_email, metodo_pago_id, fecha_vencimiento } = req.body

  try {
    // 1. Obtener empresa con credenciales MATIAS
    const { data: empresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', req.user.empresa_id)
      .single()

    // 2. Calcular totales
    const subtotal = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
    const totalIVA = items.reduce((acc, i) => acc + (i.precio * i.cantidad * (i.iva_porcentaje || 0) / 100), 0)
    const total = subtotal + totalIVA

    // 3. Obtener siguiente número de documento
    const { data: ultimo } = await supabase
      .from('facturas')
      .select('numero_documento')
      .eq('empresa_id', empresa.id)
      .eq('tipo', 'POS')
      .order('numero_documento', { ascending: false })
      .limit(1)
      .single()

    const numero_documento = (ultimo?.numero_documento || 0) + 1

    // 4. Guardar factura pendiente en BD
    const { data: factura } = await supabase
      .from('facturas')
      .insert({
        empresa_id: empresa.id,
        tipo: 'POS',
        numero_documento,
        cliente_nombre: cliente?.nombre || 'CONSUMIDOR FINAL',
        cliente_nit: cliente?.nit || '222222222',
        cliente_email: cliente?.email,
        subtotal,
        iva: totalIVA,
        total,
        medio_pago_id: medio_pago_id || 10,
        cajero: cajero_nombre,
        terminal: terminal_numero,
        metodo_pago_id: metodo_pago_id || 1,
        fecha_vencimiento: fecha_vencimiento || null,
        estado: 'PENDIENTE'
      })
      .select()
      .single()

    // 5. Guardar items
    await supabase.from('items_factura').insert(
      items.map(i => ({
        factura_id: factura.id,
        producto_codigo: i.codigo,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precio_unitario: i.precio,
        iva_porcentaje: i.iva_porcentaje || 0,
        subtotal: i.precio * i.cantidad
      }))
    )

    // 6. Llamar MATIAS API (sólo si la empresa tiene credenciales configuradas)
    const tieneMatias = !!(empresa.matias_email && empresa.matias_password && process.env.MATIAS_URL)

    if (!tieneMatias) {
      // POS no requiere DIAN — aprobamos directamente
      await supabase.from('facturas').update({ estado: 'APROBADA' }).eq('id', factura.id)
      return res.status(201).json({
        ok: true,
        factura_id: factura.id,
        numero_documento,
      })
    }

    const respuestaDIAN = await emitirDocumentoPOS(empresa, {
      numero_documento,
      cajero_nombre: cajero_nombre || 'Cajero',
      terminal_numero: terminal_numero || 'CJ001',
      venta_id: factura.id,
      cliente_nombre: cliente?.nombre || 'CONSUMIDOR FINAL',
      cliente_dni: cliente?.nit || '222222222',
      cliente_email: cliente?.email || empresa.email,
      cliente_tipo_doc: cliente?.tipo_doc_id || 3,
      subtotal,
      total,
      medio_pago_id: medio_pago_id || 10,
      enviar_email: enviar_email || false,
      items
    })

    // 7. Actualizar factura con respuesta DIAN
    await supabase
      .from('facturas')
      .update({
        estado: 'APROBADA',
        cufe: respuestaDIAN.cufe || respuestaDIAN.cude,
        matias_id: respuestaDIAN.id,
        pdf_url: respuestaDIAN.pdf_base64 ? null : respuestaDIAN.pdf_url,
        xml_url: respuestaDIAN.xml_url,
        respuesta_dian: respuestaDIAN
      })
      .eq('id', factura.id)

    res.status(201).json({
      ok: true,
      factura_id: factura.id,
      numero_documento,
      cufe: respuestaDIAN.cufe || respuestaDIAN.cude,
      pdf_url: respuestaDIAN.pdf_url,
      dian: respuestaDIAN
    })
  } catch (err) {
    console.error('Error emitiendo POS:', err.response?.data || err.message)
    res.status(500).json({ error: err.response?.data?.message || err.message })
  }
}

// POST /api/invoices — Emitir factura electrónica estándar
const emitirFacturaElectronica = async (req, res) => {
  const { items, cliente, medio_pago_id, metodo_pago_id, fecha_vencimiento } = req.body

  try {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', req.user.empresa_id)
      .single()

    const subtotal = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
    const totalIVA = items.reduce((acc, i) => acc + (i.precio * i.cantidad * (i.iva_porcentaje || 0) / 100), 0)
    const total = subtotal + totalIVA

    const { data: ultimo } = await supabase
      .from('facturas')
      .select('numero_documento')
      .eq('empresa_id', empresa.id)
      .eq('tipo', 'FE')
      .order('numero_documento', { ascending: false })
      .limit(1)
      .single()

    const numero_documento = (ultimo?.numero_documento || 0) + 1

    const { data: factura } = await supabase
      .from('facturas')
      .insert({
        empresa_id: empresa.id,
        tipo: 'FE',
        numero_documento,
        cliente_nombre: cliente.nombre,
        cliente_nit: cliente.nit,
        cliente_email: cliente.email,
        subtotal,
        iva: totalIVA,
        total,
        medio_pago_id: medio_pago_id || 10,
        estado: 'PENDIENTE'
      })
      .select()
      .single()

    await supabase.from('items_factura').insert(
      items.map(i => ({
        factura_id: factura.id,
        producto_codigo: i.codigo,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precio_unitario: i.precio,
        iva_porcentaje: i.iva_porcentaje || 0,
        subtotal: i.precio * i.cantidad
      }))
    )

    const tieneMatiasFE = !!(empresa.matias_email && empresa.matias_password && process.env.MATIAS_URL)

    if (!tieneMatiasFE) {
      return res.status(201).json({
        ok: true,
        factura_id: factura.id,
        numero_documento,
        modo_prueba: true,
        mensaje: '⚠️ Factura guardada en modo prueba. No fue enviada a la DIAN (credenciales MATIAS no configuradas).',
      })
    }

    const respuestaDIAN = await emitirFactura(empresa, {
      numero_documento,
      cliente_nombre: cliente.nombre,
      cliente_dni: cliente.nit,
      cliente_email: cliente.email,
      cliente_tipo_doc: cliente.tipo_doc_id || 3,
      cliente_ciudad_id: cliente.ciudad_id || 836,
      cliente_direccion: cliente.direccion || '',
      cliente_codigo_postal: cliente.codigo_postal || '000000',
      tipo_organizacion: cliente.tipo_organizacion_id || 2,
      regimen_fiscal: cliente.regimen_fiscal_id || 2,
      nivel_fiscal: cliente.nivel_fiscal_id || 5,
      subtotal,
      total,
      medio_pago_id: medio_pago_id || 10,
      metodo_pago_id: metodo_pago_id || 1,
      fecha_vencimiento,
      items
    })

    await supabase
      .from('facturas')
      .update({
        estado: 'APROBADA',
        cufe: respuestaDIAN.cufe,
        matias_id: respuestaDIAN.id,
        pdf_url: respuestaDIAN.pdf_url,
        xml_url: respuestaDIAN.xml_url,
        respuesta_dian: respuestaDIAN
      })
      .eq('id', factura.id)

    res.status(201).json({
      ok: true,
      factura_id: factura.id,
      numero_documento,
      cufe: respuestaDIAN.cufe,
      pdf_url: respuestaDIAN.pdf_url,
      dian: respuestaDIAN
    })
  } catch (err) {
    console.error('Error emitiendo factura:', err.response?.data || err.message)
    res.status(500).json({ error: err.response?.data?.message || err.message })
  }
}

// GET /api/invoices — Historial de facturas
const listar = async (req, res) => {
  const { tipo, estado, desde, hasta, limit = 500 } = req.query

  let query = supabase
    .from('facturas')
    .select('*', { count: 'exact' })
    .eq('empresa_id', req.user.empresa_id)
    .order('created_at', { ascending: false })
    .limit(Number(limit) || 500)

  if (tipo)  query = query.eq('tipo', tipo)
  if (estado) query = query.eq('estado', estado)
  if (desde) query = query.gte('created_at', `${desde}T00:00:00`)
  if (hasta) query = query.lte('created_at', `${hasta}T23:59:59.999`)
  if (req.query.q) query = query.ilike('numero_documento::text', `%${req.query.q}%`)

  const { data, count, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ facturas: data, total: count })
}

// GET /api/invoices/:id
const obtener = async (req, res) => {
  const { data, error } = await supabase
    .from('facturas')
    .select('*, items_factura(*)')
    .eq('id', req.params.id)
    .eq('empresa_id', req.user.empresa_id)
    .single()

  if (error) return res.status(404).json({ error: 'Factura no encontrada' })
  res.json(data)
}

// GET /api/invoices/dashboard — Resumen del día + mes + por cobrar
const dashboard = async (req, res) => {
  try {
    const hoy        = new Date().toISOString().split('T')[0]
    const primerMes  = hoy.slice(0, 7) + '-01'
    const empresa_id = req.user.empresa_id

    // Facturas de hoy
    const { data, error } = await supabase
      .from('facturas')
      .select('tipo, estado, total')
      .eq('empresa_id', empresa_id)
      .gte('created_at', `${hoy}T00:00:00`)

    if (error) return res.status(500).json({ error: error.message })

    // Ventas del mes
    const { data: mesDat } = await supabase
      .from('facturas')
      .select('total')
      .eq('empresa_id', empresa_id)
      .gte('created_at', `${primerMes}T00:00:00`)
      .in('estado', ['APROBADA', 'EMITIDA_LOCAL', 'PENDIENTE'])

    // Por cobrar — graceful: si la columna pagada no existe aún, retorna 0
    let por_cobrar = 0
    const { data: cobrarDat, error: cobrarErr } = await supabase
      .from('facturas')
      .select('total')
      .eq('empresa_id', empresa_id)
      .eq('tipo', 'FE')
      .eq('pagada', false)
      .in('estado', ['APROBADA', 'EMITIDA_LOCAL'])

    if (!cobrarErr) {
      por_cobrar = (cobrarDat || []).reduce((acc, f) => acc + (f.total || 0), 0)
    }

    res.json({
      total_ventas: data.reduce((acc, f) => acc + (f.total || 0), 0),
      num_facturas: data.length,
      aprobadas:    data.filter(f => f.estado === 'APROBADA' || f.estado === 'EMITIDA_LOCAL').length,
      pendientes:   data.filter(f => f.estado === 'PENDIENTE').length,
      ventas_mes:   (mesDat || []).reduce((acc, f) => acc + (f.total || 0), 0),
      por_cobrar,
      por_tipo: {
        POS: data.filter(f => f.tipo === 'POS').length,
        FE:  data.filter(f => f.tipo === 'FE').length
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/invoices/por-cobrar — Facturas FE pendientes de pago
const porCobrar = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .eq('empresa_id', req.user.empresa_id)
      .eq('tipo', 'FE')
      .eq('pagada', false)
      .in('estado', ['APROBADA', 'EMITIDA_LOCAL'])
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    res.json({ facturas: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PATCH /api/invoices/:id/pagar — Marcar factura como pagada
const marcarPagada = async (req, res) => {
  try {
    const { error } = await supabase
      .from('facturas')
      .update({ pagada: true })
      .eq('id', req.params.id)
      .eq('empresa_id', req.user.empresa_id)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { emitirPOS, emitirFacturaElectronica, listar, obtener, dashboard, porCobrar, marcarPagada }
