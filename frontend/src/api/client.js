import axios from 'axios'

// Empty string = relative URL → same origin (frontend + backend en un solo servicio)
const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
})

// Attach JWT — visor token (tab-specific) takes priority over localStorage
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('visor_token') || localStorage.getItem('appdian_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global error handling — don't auto-logout in visor mode
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !sessionStorage.getItem('visor_token')) {
      localStorage.removeItem('appdian_token')
      localStorage.removeItem('appdian_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ---- Auth ----
export const authApi = {
  login:             (email, password) => api.post('/auth/login', { email, password }),
  register:          (data)            => api.post('/auth/register', data),
  me:                ()                => api.get('/auth/me'),
  actualizarEmpresa: (data)            => api.patch('/auth/empresa', data),
}

// ---- Products ----
export const productsApi = {
  list: (q) => api.get('/products', { params: q ? { q } : {} }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
}

// ---- Customers ----
export const customersApi = {
  list: (q) => api.get('/customers', { params: q ? { q } : {} }),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  remove: (id) => api.delete(`/customers/${id}`),
}

// ---- Stats ----
export const statsApi = {
  resumen:      (params) => api.get('/stats/resumen',       { params }),
  tendencia:    (params) => api.get('/stats/tendencia',     { params }),
  topClientes:  (params) => api.get('/stats/top-clientes',  { params }),
  topProductos: (params) => api.get('/stats/top-productos', { params }),
  // Timeout de 90s — el modelo Nemotron 550B es lento en el tier free
  ai:           (data) => api.post('/stats/ai',           data, { timeout: 90_000 }),
  chatGeneral:  (data) => api.post('/stats/chat-general', data, { timeout: 90_000 }),
  reporteIA:    (data) => api.post('/stats/reporte-ia',   data, { timeout: 90_000 }),
  pyg:          (params) => api.get('/stats/pyg', { params }),
}

// ---- Invoices ----
export const invoicesApi = {
  dashboard:   ()     => api.get('/invoices/dashboard'),
  list:        (params) => api.get('/invoices', { params }),
  get:         (id)   => api.get(`/invoices/${id}`),
  emitirPOS:   (data) => api.post('/invoices/pos', data),
  emitirFE:    (data) => api.post('/invoices', data),
  porCobrar:   ()     => api.get('/invoices/por-cobrar'),
  marcarPagada:(id)   => api.patch(`/invoices/${id}/pagar`),
}

// ---- Gastos ----
export const gastosApi = {
  listar:     (params)   => api.get('/gastos', { params }),
  crear:      (data)     => api.post('/gastos', data),
  actualizar: (id, data) => api.put(`/gastos/${id}`, data),
  eliminar:   (id)       => api.delete(`/gastos/${id}`),
  resumen:    (params)   => api.get('/gastos/resumen', { params }),
  flujo:      (params)   => api.get('/gastos/flujo', { params }),
}

// ---- Tickets (empresa) ----
export const ticketsApi = {
  crear: (data)             => api.post('/tickets', data),
  listar: ()                => api.get('/tickets'),
  obtener: (id)              => api.get(`/tickets/${id}`),
  responder: (id, contenido) => api.post(`/tickets/${id}/mensajes`, { contenido }),
  subirArchivo: (id, file) => {
    const form = new FormData()
    form.append('archivo', file)
    return api.post(`/tickets/${id}/archivos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ---- Nómina ----
export const nominaApi = {
  // Empleados
  listarEmpleados:  ()        => api.get('/nomina/empleados'),
  crearEmpleado:    (data)    => api.post('/nomina/empleados', data),
  actualizarEmpleado:(id,data)=> api.put(`/nomina/empleados/${id}`, data),
  desactivarEmpleado:(id)     => api.delete(`/nomina/empleados/${id}`),
  // Liquidaciones
  listarLiquidaciones: ()          => api.get('/nomina/liquidaciones'),
  liquidar:            (data)      => api.post('/nomina/liquidar', data),
  obtenerLiquidacion:  (id)        => api.get(`/nomina/liquidaciones/${id}`),
  cambiarEstado:       (id, estado)=> api.patch(`/nomina/liquidaciones/${id}/estado`, { estado }),
  // Colilla
  colilla: (detalleId) => api.get(`/nomina/colilla/${detalleId}`),
}

// ---- Proyecciones tributarias ----
export const proyeccionesApi = {
  resumen:         ()     => api.get('/proyecciones'),
  actualizarConfig: (data) => api.patch('/proyecciones/config', data),
}

// ---- Vencimientos tributarios ----
export const vencimientosApi = {
  listar: () => api.get('/vencimientos'),
}

// ---- Caja Diaria ----
export const cajaDiariaApi = {
  resumenDia:      (fecha)  => api.get('/caja-diaria',          { params: fecha ? { fecha } : {} }),
  historial:       ()       => api.get('/caja-diaria/historial'),
  registrarCierre: (data)   => api.post('/caja-diaria/cierre', data),
}

// ---- Inventario ----
export const inventarioApi = {
  listar:       (params)      => api.get('/inventario',              { params }),
  resumen:      ()            => api.get('/inventario/resumen'),
  crear:        (data)        => api.post('/inventario', data),
  actualizar:   (id, data)    => api.put(`/inventario/${id}`, data),
  desactivar:   (id)          => api.delete(`/inventario/${id}`),
  movimiento:   (id, data)    => api.post(`/inventario/${id}/movimiento`, data),
  movimientos:  (id)          => api.get(`/inventario/${id}/movimientos`),
}

// ---- Panel profesional ----
export const profesionalApi = {
  accesoEmpresa: (id)            => api.get(`/profesional/empresa/${id}/acceso`),
  listarTickets: (params)        => api.get('/profesional/tickets', { params }),
  obtenerTicket: (id)            => api.get(`/profesional/tickets/${id}`),
  actualizarTicket: (id, data)   => api.patch(`/profesional/tickets/${id}`, data),
  responder: (id, contenido, es_interno = false) =>
    api.post(`/profesional/tickets/${id}/mensajes`, { contenido, es_interno }),
  resumenEmpresa: (empresa_id)   => api.get(`/profesional/empresa/${empresa_id}/resumen`),
  verPassword:    (empresa_id)   => api.get(`/profesional/empresa/${empresa_id}/ver-password`),
  listarProfesionales: ()        => api.get('/profesional/profesionales'),
  listarEmpresas:     ()        => api.get('/profesional/empresas'),
  actualizarEmpresa:  (id, data) => api.patch(`/profesional/empresas/${id}`, data),
  listarAudit:    (params)  => api.get('/profesional/audit', { params }),
  subirArchivo: (ticket_id, file) => {
    const form = new FormData()
    form.append('archivo', file)
    return api.post(`/profesional/tickets/${ticket_id}/archivos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
