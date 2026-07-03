const supabase = require('../config/db')
const audit   = require('../services/auditService')

// ── Constantes 2025 ───────────────────────────────────────────────────────────
const SMLV          = 1423500
const AUX_TRANSPORTE = 200000
const TASAS_ARL     = { 1: 0.00522, 2: 0.01044, 3: 0.02436, 4: 0.04350, 5: 0.06960 }

function round2(n) { return Math.round((n || 0) * 100) / 100 }

function calcularDetalle(emp, ajustes = {}) {
  const s    = Number(emp.salario_base)
  const dias = Number(ajustes.dias_trabajados ?? 30)

  // Devengos
  const salario           = round2((s / 30) * dias)
  const tieneAux          = s <= SMLV * 2
  const auxTransporte     = tieneAux ? round2((AUX_TRANSPORTE / 30) * dias) : 0
  const horasExtras       = round2(ajustes.horas_extras    || 0)
  const bonificaciones    = round2(ajustes.bonificaciones  || 0)
  const totalDevengado    = round2(salario + auxTransporte + horasExtras + bonificaciones)

  // Deducciones empleado (sobre salario proporcional, NO sobre aux transporte)
  const dedSalud      = round2(salario * 0.04)
  const dedPension    = round2(salario * 0.04)
  const dedRetencion  = round2(ajustes.ded_retencion || 0)
  const dedOtros      = round2(ajustes.ded_otros     || 0)
  const totalDeduc    = round2(dedSalud + dedPension + dedRetencion + dedOtros)
  const netoPagar     = round2(totalDevengado - totalDeduc)

  // Aportes empleador
  const tArl    = TASAS_ARL[emp.riesgo_arl] || TASAS_ARL[1]
  const apSalud = round2(salario * 0.085)
  const apPens  = round2(salario * 0.12)
  const apArl   = round2(salario * tArl)
  const apSena  = round2(salario * 0.02)
  const apIcbf  = round2(salario * 0.03)
  const apCaja  = round2(salario * 0.04)
  const totalAp = round2(apSalud + apPens + apArl + apSena + apIcbf + apCaja)

  // Provisiones mensuales (base = salario + aux, el aux SÍ va en prima y cesantías)
  const baseProv       = salario + auxTransporte
  const provPrima      = round2(baseProv / 12)
  const provCes        = round2(baseProv / 12)
  const provIntCes     = round2(provCes * 0.12 / 12)
  const provVac        = round2(salario / 24)

  return {
    nombre_empleado:   `${emp.nombre} ${emp.apellido}`,
    num_doc:           emp.num_doc,
    cargo:             emp.cargo,
    salario_base:      s,
    dias_trabajados:   dias,
    salario,
    auxilio_transporte: auxTransporte,
    horas_extras:      horasExtras,
    bonificaciones,
    total_devengado:   totalDevengado,
    ded_salud:         dedSalud,
    ded_pension:       dedPension,
    ded_retencion:     dedRetencion,
    ded_otros:         dedOtros,
    total_deducciones: totalDeduc,
    neto_pagar:        netoPagar,
    ap_salud:          apSalud,
    ap_pension:        apPens,
    ap_arl:            apArl,
    ap_sena:           apSena,
    ap_icbf:           apIcbf,
    ap_caja:           apCaja,
    total_aportes:     totalAp,
    prov_prima:        provPrima,
    prov_cesantias:    provCes,
    prov_int_cesantias: provIntCes,
    prov_vacaciones:   provVac,
  }
}

// ── Empleados ─────────────────────────────────────────────────────────────────

const listarEmpleados = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('empleados').select('*')
      .eq('empresa_id', req.user.empresa_id)
      .eq('activo', true).order('apellido')
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
}

const crearEmpleado = async (req, res) => {
  const empresa_id = req.user.empresa_id
  try {
    const { data, error } = await supabase.from('empleados')
      .insert({ ...req.body, empresa_id }).select().single()
    if (error) throw error
    audit.log({ tipo: 'EMPLEADO_CREADO', descripcion: `Empleado creado: ${data.nombre} ${data.apellido} · ${data.cargo}`, empresa_id })
    res.status(201).json(data)
  } catch (err) { res.status(400).json({ error: err.message }) }
}

const actualizarEmpleado = async (req, res) => {
  const empresa_id = req.user.empresa_id
  try {
    const { data, error } = await supabase.from('empleados')
      .update(req.body).eq('id', req.params.id).eq('empresa_id', empresa_id)
      .select().single()
    if (error) throw error
    audit.log({ tipo: 'EMPLEADO_EDITADO', descripcion: `Empleado editado: ${data.nombre} ${data.apellido}`, empresa_id })
    res.json(data)
  } catch (err) { res.status(400).json({ error: err.message }) }
}

const desactivarEmpleado = async (req, res) => {
  const empresa_id = req.user.empresa_id
  try {
    const { error } = await supabase.from('empleados')
      .update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] })
      .eq('id', req.params.id).eq('empresa_id', empresa_id)
    if (error) throw error
    audit.log({ tipo: 'EMPLEADO_RETIRADO', descripcion: `Empleado retirado (id: ${req.params.id})`, empresa_id })
    res.json({ ok: true })
  } catch (err) { res.status(400).json({ error: err.message }) }
}

// ── Liquidaciones ─────────────────────────────────────────────────────────────

const listarLiquidaciones = async (req, res) => {
  try {
    const { data, error } = await supabase.from('nomina_liquidaciones')
      .select('*').eq('empresa_id', req.user.empresa_id)
      .order('periodo', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// POST /api/nomina/liquidar  — calcula y persiste una liquidación
const liquidar = async (req, res) => {
  const empresa_id = req.user.empresa_id
  const { periodo, ajustes = {} } = req.body  // ajustes: { [empleado_id]: { dias, horas_extras, ... } }
  if (!periodo) return res.status(400).json({ error: 'El campo periodo es requerido (YYYY-MM)' })

  try {
    // Empleados activos
    const { data: empleados, error: eErr } = await supabase
      .from('empleados').select('*')
      .eq('empresa_id', empresa_id).eq('activo', true)
    if (eErr) throw eErr
    if (!empleados.length) return res.status(400).json({ error: 'No hay empleados activos' })

    // Upsert encabezado
    const { data: liq, error: lErr } = await supabase
      .from('nomina_liquidaciones')
      .upsert({ empresa_id, periodo, estado: 'BORRADOR' }, { onConflict: 'empresa_id,periodo' })
      .select().single()
    if (lErr) throw lErr

    // Borrar detalles anteriores (re-liquidación)
    await supabase.from('nomina_detalle').delete().eq('liquidacion_id', liq.id)

    // Calcular detalle por empleado
    const detalles = empleados.map(emp => ({
      liquidacion_id: liq.id,
      empleado_id:    emp.id,
      ...calcularDetalle(emp, ajustes[emp.id] || {}),
    }))

    const { error: dErr } = await supabase.from('nomina_detalle').insert(detalles)
    if (dErr) throw dErr

    // Totales
    const totalDevengado  = detalles.reduce((s, d) => s + d.total_devengado,   0)
    const totalDeduc      = detalles.reduce((s, d) => s + d.total_deducciones,  0)
    const totalAportes    = detalles.reduce((s, d) => s + d.total_aportes,      0)
    const totalNeto       = detalles.reduce((s, d) => s + d.neto_pagar,         0)

    await supabase.from('nomina_liquidaciones').update({
      num_empleados: empleados.length,
      total_devengado:       round2(totalDevengado),
      total_deducciones:     round2(totalDeduc),
      total_aportes_empresa: round2(totalAportes),
      total_neto:            round2(totalNeto),
    }).eq('id', liq.id)

    audit.log({
      tipo: 'NOMINA_LIQUIDADA',
      descripcion: `Nómina liquidada para periodo ${periodo} · ${empleados.length} empleados · Neto: $${Math.round(totalNeto).toLocaleString('es-CO')}`,
      empresa_id,
    })

    res.json({ ...liq, num_empleados: empleados.length, total_devengado: totalDevengado, total_neto: totalNeto })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// GET /api/nomina/liquidaciones/:id  — detalle con empleados
const obtenerLiquidacion = async (req, res) => {
  const empresa_id = req.user.empresa_id
  try {
    const { data: liq, error: lErr } = await supabase
      .from('nomina_liquidaciones').select('*')
      .eq('id', req.params.id).eq('empresa_id', empresa_id).single()
    if (lErr) return res.status(404).json({ error: 'Liquidación no encontrada' })

    const { data: detalles, error: dErr } = await supabase
      .from('nomina_detalle').select('*').eq('liquidacion_id', liq.id)
    if (dErr) throw dErr

    res.json({ ...liq, detalles: detalles || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// PATCH /api/nomina/liquidaciones/:id/estado
const cambiarEstado = async (req, res) => {
  const empresa_id = req.user.empresa_id
  const { estado } = req.body
  try {
    const { data, error } = await supabase.from('nomina_liquidaciones')
      .update({ estado }).eq('id', req.params.id).eq('empresa_id', empresa_id)
      .select().single()
    if (error) throw error
    audit.log({ tipo: 'NOMINA_ESTADO', descripcion: `Nómina ${data.periodo} → estado: ${estado}`, empresa_id })
    res.json(data)
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// GET /api/nomina/colilla/:detalleId  — datos para imprimir colilla
const colilla = async (req, res) => {
  const empresa_id = req.user.empresa_id
  try {
    const { data: det, error: dErr } = await supabase
      .from('nomina_detalle').select('*, nomina_liquidaciones(periodo, empresa_id)')
      .eq('id', req.params.detalleId).single()
    if (dErr || !det) return res.status(404).json({ error: 'Detalle no encontrado' })
    if (det.nomina_liquidaciones.empresa_id !== empresa_id)
      return res.status(403).json({ error: 'Acceso denegado' })

    const { data: empresa } = await supabase
      .from('empresas').select('nombre, nit, direccion, telefono').eq('id', empresa_id).single()

    res.json({ detalle: det, empresa, periodo: det.nomina_liquidaciones.periodo })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

module.exports = { listarEmpleados, crearEmpleado, actualizarEmpleado, desactivarEmpleado, listarLiquidaciones, liquidar, obtenerLiquidacion, cambiarEstado, colilla }
