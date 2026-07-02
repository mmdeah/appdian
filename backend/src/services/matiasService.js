const axios = require('axios')

const MATIAS_URL = process.env.MATIAS_URL
// Cache de tokens por empresa para no re-autenticar en cada llamada
const tokenCache = {}

/**
 * Obtiene token MATIAS para una empresa.
 * Cada empresa tiene sus propias credenciales MATIAS en la tabla empresas.
 */
async function getToken(empresa) {
  const cacheKey = empresa.id
  const cached = tokenCache[cacheKey]

  // Reusar token si no expiró (tokens duran ~60min, refreshamos cada 50)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.token
  }

  const res = await axios.post(`${MATIAS_URL}/auth/login`, {
    email: empresa.matias_email,
    password: empresa.matias_password,
    remember_me: 0
  })

  const token = res.data.token
  tokenCache[cacheKey] = {
    token,
    expiresAt: Date.now() + 50 * 60 * 1000 // 50 min
  }
  return token
}

/**
 * Emite un documento POS electrónico ante la DIAN via MATIAS.
 * type_document_id: 20 = Documento Equivalente POS
 */
async function emitirDocumentoPOS(empresa, datos) {
  const token = await getToken(empresa)

  const payload = {
    resolution_number: empresa.resolucion_numero,
    prefix: empresa.resolucion_prefijo,
    document_number: String(datos.numero_documento),
    operation_type_id: 1,
    type_document_id: 20,
    graphic_representation: 1,
    send_email: datos.enviar_email ? 1 : 0,

    point_of_sale: {
      cashier_name: datos.cajero_nombre,
      terminal_number: datos.terminal_numero,
      cashier_type: 'GENÉRICA',
      sales_code: String(datos.venta_id),
      address: empresa.direccion,
      sub_total: String(datos.subtotal.toFixed(2))
    },

    software_manufacturer: {
      owner_name: 'AppDian',
      company_name: 'AppDian SAS',
      software_name: 'AppDian POS'
    },

    customer: {
      company_name: datos.cliente_nombre || 'CONSUMIDOR FINAL',
      dni: datos.cliente_dni || '222222222',
      email: datos.cliente_email || empresa.email,
      identity_document_id: datos.cliente_tipo_doc || 3,
      type_organization_id: 2,
      tax_regime_id: 2,
      tax_level_id: 5
    },

    payments: [{
      payment_method_id: 1,
      means_payment_id: datos.medio_pago_id || 10, // 10=Efectivo
      value_paid: String(datos.total.toFixed(2))
    }],

    legal_monetary_totals: {
      line_extension_amount: String(datos.subtotal.toFixed(2)),
      tax_exclusive_amount: String(datos.subtotal.toFixed(2)),
      tax_inclusive_amount: String(datos.total.toFixed(2)),
      payable_amount: String(datos.total.toFixed(2))
    },

    lines: datos.items.map((item) => ({
      invoiced_quantity: String(item.cantidad),
      quantity_units_id: '1093',
      line_extension_amount: String((item.precio * item.cantidad).toFixed(2)),
      description: item.descripcion,
      code: item.codigo,
      price_amount: String(item.precio.toFixed(2)),
      base_quantity: String(item.cantidad),
      ...(item.iva_porcentaje > 0 && {
        tax_totals: [{
          tax_id: '01',
          tax_amount: parseFloat((item.precio * item.cantidad * item.iva_porcentaje / 100).toFixed(2)),
          taxable_amount: parseFloat((item.precio * item.cantidad).toFixed(2)),
          percent: item.iva_porcentaje
        }]
      })
    })),

    ...(datos.items.some(i => i.iva_porcentaje > 0) && {
      tax_totals: calcularTotalesImpuesto(datos.items)
    })
  }

  const res = await axios.post(`${MATIAS_URL}/invoices`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  })

  return res.data
}

/**
 * Emite una factura electrónica estándar (type_document_id: 7)
 */
async function emitirFactura(empresa, datos) {
  const token = await getToken(empresa)

  const payload = {
    resolution_number: empresa.resolucion_numero,
    prefix: empresa.resolucion_prefijo,
    document_number: String(datos.numero_documento),
    operation_type_id: 1,
    type_document_id: 7,
    graphic_representation: 1,
    send_email: 1,

    customer: {
      company_name: datos.cliente_nombre,
      dni: datos.cliente_dni,
      email: datos.cliente_email,
      identity_document_id: datos.cliente_tipo_doc || 3,
      type_organization_id: datos.tipo_organizacion || 2,
      tax_regime_id: datos.regimen_fiscal || 2,
      tax_level_id: datos.nivel_fiscal || 5,
      city_id: datos.cliente_ciudad_id || 836,
      address: datos.cliente_direccion || '',
      postal_code: datos.cliente_codigo_postal || '000000'
    },

    payments: [{
      payment_method_id: datos.metodo_pago_id || 1,
      means_payment_id: datos.medio_pago_id || 10,
      value_paid: String(datos.total.toFixed(2)),
      ...(datos.metodo_pago_id === 2 && { payment_due_date: datos.fecha_vencimiento })
    }],

    legal_monetary_totals: {
      line_extension_amount: String(datos.subtotal.toFixed(2)),
      tax_exclusive_amount: String(datos.subtotal.toFixed(2)),
      tax_inclusive_amount: String(datos.total.toFixed(2)),
      payable_amount: String(datos.total.toFixed(2))
    },

    lines: datos.items.map((item) => ({
      invoiced_quantity: String(item.cantidad),
      quantity_units_id: '1093',
      line_extension_amount: String((item.precio * item.cantidad).toFixed(2)),
      description: item.descripcion,
      code: item.codigo,
      price_amount: String(item.precio.toFixed(2)),
      base_quantity: String(item.cantidad),
      ...(item.iva_porcentaje > 0 && {
        tax_totals: [{
          tax_id: '01',
          tax_amount: parseFloat((item.precio * item.cantidad * item.iva_porcentaje / 100).toFixed(2)),
          taxable_amount: parseFloat((item.precio * item.cantidad).toFixed(2)),
          percent: item.iva_porcentaje
        }]
      })
    })),

    ...(datos.items.some(i => i.iva_porcentaje > 0) && {
      tax_totals: calcularTotalesImpuesto(datos.items)
    })
  }

  const res = await axios.post(`${MATIAS_URL}/invoices`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  })

  return res.data
}

/**
 * Consulta estado de un documento en DIAN
 */
async function consultarDocumento(empresa, documentoId) {
  const token = await getToken(empresa)
  const res = await axios.get(`${MATIAS_URL}/invoices/${documentoId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}

// Helper: agrupa impuestos por tipo para el campo global tax_totals
function calcularTotalesImpuesto(items) {
  const totales = {}
  items.forEach(item => {
    if (item.iva_porcentaje > 0) {
      const key = `01_${item.iva_porcentaje}`
      if (!totales[key]) {
        totales[key] = { tax_id: '01', tax_amount: 0, taxable_amount: 0, percent: item.iva_porcentaje }
      }
      const base = item.precio * item.cantidad
      totales[key].taxable_amount += base
      totales[key].tax_amount += base * item.iva_porcentaje / 100
    }
  })
  return Object.values(totales).map(t => ({
    tax_id: t.tax_id,
    tax_amount: parseFloat(t.tax_amount.toFixed(2)),
    taxable_amount: parseFloat(t.taxable_amount.toFixed(2)),
    percent: t.percent
  }))
}

module.exports = { emitirDocumentoPOS, emitirFactura, consultarDocumento }
