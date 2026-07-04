const supabase = require('../config/db')

// ── helpers ────────────────────────────────────────────────────────────────────
async function callOpenRouter({ system, user, temperature = 0.7, max_tokens = 1024 }) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada en Railway')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method : 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type' : 'application/json',
      'HTTP-Referer'  : 'https://appdian.app',
      'X-Title'       : 'AppDian',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
      temperature,
      max_tokens,
    }),
  })

  if (!response.ok) {
    const txt = await response.text()
    throw new Error(txt)
  }

  const json    = await response.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('El modelo no generó respuesta (posible saturación del tier free). Intenta de nuevo.')
  return content
}

// ── GET /api/stats/resumen ─────────────────────────────────────────────────────
const resumen = async (req, res) => {
  try {
    const { desde, hasta } = req.query
    const empresa_id = req.user.empresa_id

    let q = supabase
      .from('facturas')
      .select('total, iva, subtotal, tipo')
      .eq('empresa_id', empresa_id)
      .in('estado', ['APROBADA', 'EMITIDA_LOCAL', 'PENDIENTE'])

    if (desde) q = q.gte('created_at', `${desde}T00:00:00`)
    if (hasta) q = q.lte('created_at', `${hasta}T23:59:59`)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })

    const total_ventas   = data.reduce((a, f) => a + (f.total || 0), 0)
    const total_iva      = data.reduce((a, f) => a + (f.iva || 0), 0)
    const total_subtotal = data.reduce((a, f) => a + (f.subtotal || 0), 0)
    const num_facturas   = data.length
    const promedio       = num_facturas > 0 ? total_ventas / num_facturas : 0

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
        .in('estado', ['APROBADA', 'EMITIDA_LOCAL', 'PENDIENTE'])
        .gte('created_at', prevDesde.toISOString().split('T')[0] + 'T00:00:00')
        .lte('created_at', prevHasta.toISOString().split('T')[0] + 'T23:59:59')

      const prevTotal = (prev || []).reduce((a, f) => a + (f.total || 0), 0)
      comparacion = {
        periodo_anterior: prevTotal,
        variacion_pct   : prevTotal > 0 ? +((total_ventas - prevTotal) / prevTotal * 100).toFixed(1) : null,
      }
    }

    res.json({ total_ventas, total_iva, total_subtotal, num_facturas, promedio,
      por_tipo: { POS: data.filter(f=>f.tipo==='POS').length, FE: data.filter(f=>f.tipo==='FE').length },
      comparacion })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// ── GET /api/stats/tendencia ───────────────────────────────────────────────────
const tendencia = async (req, res) => {
  try {
    const { desde, hasta, agrupacion = 'dia' } = req.query
    const empresa_id = req.user.empresa_id

    let q = supabase.from('facturas').select('created_at, total')
      .eq('empresa_id', empresa_id).in('estado', ['APROBADA','EMITIDA_LOCAL','PENDIENTE'])
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
        key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      } else if (agrupacion === 'semana') {
        const day = d.getDay() || 7
        const lunes = new Date(d); lunes.setDate(d.getDate() - day + 1)
        key = lunes.toISOString().split('T')[0]
      } else {
        key = d.toISOString().split('T')[0]
      }
      grupos[key] = (grupos[key] || 0) + (f.total || 0)
    }

    res.json(Object.entries(grupos).sort(([a],[b])=>a.localeCompare(b)).map(([fecha,total])=>({ fecha, total: Math.round(total) })))
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// ── GET /api/stats/top-clientes ────────────────────────────────────────────────
const topClientes = async (req, res) => {
  try {
    const { desde, hasta, limit = 10 } = req.query
    const empresa_id = req.user.empresa_id

    let q = supabase.from('facturas').select('cliente_nombre, total')
      .eq('empresa_id', empresa_id).in('estado', ['APROBADA','EMITIDA_LOCAL','PENDIENTE'])
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

    res.json(Object.entries(mapa).sort(([,a],[,b])=>b-a).slice(0,+limit).map(([nombre,total])=>({ nombre, total: Math.round(total) })))
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// ── GET /api/stats/top-productos ──────────────────────────────────────────────
const topProductos = async (req, res) => {
  try {
    const { desde, hasta, limit = 10 } = req.query
    const empresa_id = req.user.empresa_id

    let qf = supabase.from('facturas').select('id').eq('empresa_id', empresa_id)
      .in('estado', ['APROBADA','EMITIDA_LOCAL','PENDIENTE'])

    if (desde) qf = qf.gte('created_at', `${desde}T00:00:00`)
    if (hasta) qf = qf.lte('created_at', `${hasta}T23:59:59`)

    const { data: facturas, error: fe } = await qf
    if (fe) return res.status(500).json({ error: fe.message })
    if (!facturas.length) return res.json([])

    const { data: items, error: ie } = await supabase
      .from('items_factura').select('descripcion, cantidad, subtotal')
      .in('factura_id', facturas.map(f=>f.id))

    if (ie) return res.status(500).json({ error: ie.message })

    const mapa = {}
    for (const i of items) {
      const n = i.descripcion || 'Sin descripción'
      if (!mapa[n]) mapa[n] = { cantidad: 0, total: 0 }
      mapa[n].cantidad += (i.cantidad || 0)
      mapa[n].total    += (i.subtotal || 0)
    }

    res.json(Object.entries(mapa).sort(([,a],[,b])=>b.total-a.total).slice(0,+limit)
      .map(([nombre,{cantidad,total}])=>({ nombre, cantidad: Math.round(cantidad), total: Math.round(total) })))
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// ── POST /api/stats/ai — Analista de datos de la empresa ─────────────────────
const aiAnalisis = async (req, res) => {
  try {
    const { pregunta, contexto } = req.body
    if (!pregunta) return res.status(400).json({ error: 'pregunta requerida' })

    const system = `Eres un analista financiero senior experto en contabilidad colombiana y facturación electrónica DIAN. Respondes siempre en español.

IMPORTANTE: Tienes acceso a los datos REALES de la empresa del usuario en el período analizado.
Estos datos incluyen: ventas (POS y facturas electrónicas), gastos operativos, caja diaria (cierres y efectivo), inventario de productos, cuentas por cobrar (facturas FE sin pagar), y nómina.

FORMATO OBLIGATORIO:

## 📊 Resumen
[2-3 oraciones con el hallazgo más importante. Cifras clave en **negrita**.]

---

## 🔍 Análisis
[Análisis detallado. Usa tablas para comparaciones. Listas para múltiples puntos.]

---

## 💡 Recomendaciones
1. [Acción concreta con cifra]
2. [Acción concreta]
3. [Acción concreta]

---
> 💼 *Consulta con tu contador para decisiones fiscales importantes.*

REGLAS:
- Cifras en pesos colombianos: $1.234.567 COP
- Máximo 400 palabras
- Período: ${contexto?.periodo?.desde || '—'} al ${contexto?.periodo?.hasta || '—'}

DATOS REALES DE LA EMPRESA EN ESTE PERÍODO:
${JSON.stringify(contexto, null, 2)}`

    const respuesta = await callOpenRouter({ system, user: pregunta })
    res.json({ respuesta })
  } catch (err) {
    if (err.message.includes('OPENROUTER')) return res.status(500).json({ error: err.message })
    if (err.message.includes('saturación') || err.message.includes('no generó')) return res.status(503).json({ error: err.message })
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/stats/chat-general — Consultor contable general (sin datos) ─────
const chatGeneral = async (req, res) => {
  try {
    const { pregunta } = req.body
    if (!pregunta) return res.status(400).json({ error: 'pregunta requerida' })

    const system = `Eres un consultor experto en contabilidad colombiana, tributación, DIAN, NIIF, normativa fiscal y laboral. Respondes en español.

IMPORTANTE: NO tienes acceso a los datos de ninguna empresa. Das información general, educativa y normativa.
Cuando el usuario pregunte sobre sus propios datos ("mis ventas", "mi empresa"), explícale amablemente que para eso debe ir a la sección Estadísticas donde el agente puede leer sus datos reales.

FORMATO:
## [Emoji] [Título breve]
[Respuesta clara y práctica en párrafos o listas]

> 💼 *Siempre confirma con tu contador certificado para casos específicos.*

REGLAS:
- Español colombiano, tono profesional pero accesible
- Menciona el año fiscal si das tarifas o porcentajes (pueden cambiar)
- Máximo 300 palabras
- No inventes cifras — si no sabes algo con certeza, dilo`

    const respuesta = await callOpenRouter({ system, user: pregunta, temperature: 0.5 })
    res.json({ respuesta })
  } catch (err) {
    if (err.message.includes('OPENROUTER')) return res.status(500).json({ error: err.message })
    if (err.message.includes('saturación') || err.message.includes('no generó')) return res.status(503).json({ error: err.message })
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/stats/reporte-ia ─────────────────────────────────────────────────
const reporteIA = async (req, res) => {
  try {
    const { periodo, resumen: ven, gastos, tendencia, clientes, productos, cajaDiaria, inventario, porCobrar } = req.body

    const utilidad_bruta = (ven?.total_ventas || 0) - (gastos?.total_gastos || 0)
    const margen_pct     = ven?.total_ventas > 0 ? ((utilidad_bruta / ven.total_ventas) * 100).toFixed(1) : 0

    const system = `Eres un analista financiero senior colombiano. Redacta un REPORTE FINANCIERO EJECUTIVO formal para el período ${periodo?.desde} al ${periodo?.hasta}. Responde en español.

ESTRUCTURA OBLIGATORIA:

# REPORTE FINANCIERO — ${periodo?.desde} al ${periodo?.hasta}

## 1. RESUMEN EJECUTIVO
[3-4 oraciones resumiendo el desempeño. Incluye cifras principales.]

---

## 2. INGRESOS
[Análisis de ventas: total, POS vs FE, ticket promedio, comparación período anterior.]

---

## 3. GASTOS
[Egresos por categoría, IVA pagado, principales proveedores.]

---

## 4. RESULTADO OPERACIONAL
| Concepto | Valor |
|---|---|
| Ingresos totales | $X |
| Gastos totales | $X |
| Utilidad bruta | $X |
| Margen de utilidad | X% |

---

## 5. CAJA Y CARTERA
[Resumen de cierres de caja y cuentas por cobrar pendientes si hay datos.]

---

## 6. INDICADORES CLAVE
[KPIs más relevantes: crecimiento, eficiencia, alertas]

---

## 7. CLIENTES Y SERVICIOS DESTACADOS
[Top 3 clientes y top 3 productos del período]

---

## 8. RECOMENDACIONES
1. [Acción con cifra]
2. [Acción]
3. [Acción]

---
> *Reporte generado por AppDian. Consulte con su contador para decisiones fiscales.*

REGLAS: Cifras en COP $1.234.567. Máximo 650 palabras. Tono formal. Valores en **negrita**.

DATOS:
${JSON.stringify({ periodo, ingresos: ven, gastos, utilidad_bruta, margen_pct, tendencia, top_clientes: clientes, top_productos: productos, caja_diaria: cajaDiaria, inventario, por_cobrar: porCobrar }, null, 2)}`

    const reporte = await callOpenRouter({ system, user: 'Genera el reporte financiero ejecutivo completo.', temperature: 0.4, max_tokens: 1500 })
    res.json({ reporte })
  } catch (err) {
    if (err.message.includes('OPENROUTER')) return res.status(500).json({ error: err.message })
    res.status(503).json({ error: err.message })
  }
}

module.exports = { resumen, tendencia, topClientes, topProductos, aiAnalisis, chatGeneral, reporteIA }
