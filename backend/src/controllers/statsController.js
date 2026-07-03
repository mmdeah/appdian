const supabase = require('../config/db')

// GET /api/stats/resumen?desde=&hasta=
const resumen = async (req, res) => {
  try {
    const { desde, hasta } = req.query
    const empresa_id = req.user.empresa_id

    let q = supabase
      .from('facturas')
      .select('total, iva, subtotal, tipo')
      .eq('empresa_id', empresa_id)
      .eq('estado', 'APROBADA')

    if (desde) q = q.gte('created_at', `${desde}T00:00:00`)
    if (hasta) q = q.lte('created_at', `${hasta}T23:59:59`)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })

    const total_ventas   = data.reduce((a, f) => a + (f.total || 0), 0)
    const total_iva      = data.reduce((a, f) => a + (f.iva || 0), 0)
    const total_subtotal = data.reduce((a, f) => a + (f.subtotal || 0), 0)
    const num_facturas   = data.length
    const promedio       = num_facturas > 0 ? total_ventas / num_facturas : 0

    // Comparación con período anterior de igual duración
    let comparacion = null
    if (desde && hasta) {
      const d1      = new Date(desde)
      const d2      = new Date(hasta)
      const diff_ms = d2 - d1 + 86_400_000
      const prevHasta = new Date(d1.getTime() - 1)
      const prevDesde = new Date(d1.getTime() - diff_ms)

      const { data: prev } = await supabase
        .from('facturas')
        .select('total')
        .eq('empresa_id', empresa_id)
        .eq('estado', 'APROBADA')
        .gte('created_at', prevDesde.toISOString().split('T')[0] + 'T00:00:00')
        .lte('created_at', prevHasta.toISOString().split('T')[0] + 'T23:59:59')

      const prevTotal = (prev || []).reduce((a, f) => a + (f.total || 0), 0)
      comparacion = {
        periodo_anterior: prevTotal,
        variacion_pct: prevTotal > 0
          ? +((total_ventas - prevTotal) / prevTotal * 100).toFixed(1)
          : null,
      }
    }

    res.json({
      total_ventas,
      total_iva,
      total_subtotal,
      num_facturas,
      promedio,
      por_tipo: {
        POS: data.filter(f => f.tipo === 'POS').length,
        FE:  data.filter(f => f.tipo === 'FE').length,
      },
      comparacion,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/stats/tendencia?desde=&hasta=&agrupacion=dia|semana|mes
const tendencia = async (req, res) => {
  try {
    const { desde, hasta, agrupacion = 'dia' } = req.query
    const empresa_id = req.user.empresa_id

    let q = supabase
      .from('facturas')
      .select('created_at, total')
      .eq('empresa_id', empresa_id)
      .eq('estado', 'APROBADA')
      .order('created_at', { ascending: true })

    if (desde) q = q.gte('created_at', `${desde}T00:00:00`)
    if (hasta) q = q.lte('created_at', `${hasta}T23:59:59`)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })

    const grupos = {}
    for (const f of data) {
      const d = new Date(f.created_at)
      let key
      if (agrupacion === 'mes') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      } else if (agrupacion === 'semana') {
        const day = d.getDay() || 7
        const lunes = new Date(d)
        lunes.setDate(d.getDate() - day + 1)
        key = lunes.toISOString().split('T')[0]
      } else {
        key = d.toISOString().split('T')[0]
      }
      grupos[key] = (grupos[key] || 0) + (f.total || 0)
    }

    const serie = Object.entries(grupos)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({ fecha, total: Math.round(total) }))

    res.json(serie)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/stats/top-clientes?desde=&hasta=&limit=10
const topClientes = async (req, res) => {
  try {
    const { desde, hasta, limit = 10 } = req.query
    const empresa_id = req.user.empresa_id

    let q = supabase
      .from('facturas')
      .select('cliente_nombre, total')
      .eq('empresa_id', empresa_id)
      .eq('estado', 'APROBADA')
      .neq('cliente_nombre', 'CONSUMIDOR FINAL')

    if (desde) q = q.gte('created_at', `${desde}T00:00:00`)
    if (hasta) q = q.lte('created_at', `${hasta}T23:59:59`)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })

    const mapa = {}
    for (const f of data) {
      const n = f.cliente_nombre || 'Sin nombre'
      mapa[n] = (mapa[n] || 0) + (f.total || 0)
    }

    const top = Object.entries(mapa)
      .sort(([, a], [, b]) => b - a)
      .slice(0, +limit)
      .map(([nombre, total]) => ({ nombre, total: Math.round(total) }))

    res.json(top)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/stats/top-productos?desde=&hasta=&limit=10
const topProductos = async (req, res) => {
  try {
    const { desde, hasta, limit = 10 } = req.query
    const empresa_id = req.user.empresa_id

    let qf = supabase
      .from('facturas')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('estado', 'APROBADA')

    if (desde) qf = qf.gte('created_at', `${desde}T00:00:00`)
    if (hasta) qf = qf.lte('created_at', `${hasta}T23:59:59`)

    const { data: facturas, error: fe } = await qf
    if (fe) return res.status(500).json({ error: fe.message })
    if (!facturas.length) return res.json([])

    const ids = facturas.map(f => f.id)
    const { data: items, error: ie } = await supabase
      .from('items_factura')
      .select('descripcion, cantidad, subtotal')
      .in('factura_id', ids)

    if (ie) return res.status(500).json({ error: ie.message })

    const mapa = {}
    for (const i of items) {
      const n = i.descripcion || 'Sin descripción'
      if (!mapa[n]) mapa[n] = { cantidad: 0, total: 0 }
      mapa[n].cantidad += (i.cantidad || 0)
      mapa[n].total    += (i.subtotal || 0)
    }

    const top = Object.entries(mapa)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, +limit)
      .map(([nombre, { cantidad, total }]) => ({
        nombre,
        cantidad: Math.round(cantidad),
        total: Math.round(total),
      }))

    res.json(top)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/stats/ai  { pregunta, contexto }
const aiAnalisis = async (req, res) => {
  try {
    const { pregunta, contexto } = req.body
    if (!pregunta) return res.status(400).json({ error: 'pregunta requerida' })

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY no configurada en Railway' })

    const system = `Eres un analista financiero senior experto en contabilidad colombiana y facturación electrónica DIAN. Respondes siempre en español.

FORMATO OBLIGATORIO — usa EXACTAMENTE esta estructura Markdown:

## 📊 Resumen Ejecutivo
[2-3 oraciones con el hallazgo más importante. Incluye las cifras clave en **negrita**.]

---

## 🔍 Análisis
[Contenido detallado. Usa tablas Markdown para comparaciones numéricas. Usa listas para múltiples puntos.]

---

## 💡 Recomendaciones
1. [Acción concreta con cifra específica]
2. [Acción concreta]
3. [Acción concreta]

---
> 💼 *Consulta con tu contador para decisiones fiscales importantes.*

REGLAS ESTRICTAS:
- Cifras en pesos colombianos: $1.234.567 COP
- Emojis en los encabezados para visual (📊 💰 📈 📉 ⚠️ ✅ 💡 🎯 👑 🧾)
- Tablas para comparar más de 2 valores numéricos
- Máximo 400 palabras en total
- Siempre menciona el período analizado (${contexto?.periodo?.desde} al ${contexto?.periodo?.hasta})

DATOS DEL PERÍODO:
${JSON.stringify(contexto, null, 2)}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://appdian.app',
        'X-Title': 'AppDian Analista Contable',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: pregunta },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const txt = await response.text()
      return res.status(response.status).json({ error: txt })
    }

    const json = await response.json()

    // El tier free de algunos modelos devuelve 200 con content vacío cuando está saturado
    const respuesta = json.choices?.[0]?.message?.content
    if (!respuesta) {
      console.error('OpenRouter respuesta vacía:', JSON.stringify(json).slice(0, 500))
      return res.status(503).json({
        error: 'El modelo no generó respuesta (posible saturación del tier free). Intenta de nuevo en unos segundos.',
      })
    }

    res.json({ respuesta })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { resumen, tendencia, topClientes, topProductos, aiAnalisis }
