import axios from 'axios'

// Empty string = relative URL → same origin (frontend + backend en un solo servicio)
const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('appdian_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
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
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  googleAuth: (access_token) => api.post('/auth/google', { access_token }),
  me: () => api.get('/auth/me'),
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
  ai: (data) => api.post('/stats/ai', data, { timeout: 90_000 }),
}

// ---- Invoices ----
export const invoicesApi = {
  dashboard: () => api.get('/invoices/dashboard'),
  list: (params) => api.get('/invoices', { params }),
  get: (id) => api.get(`/invoices/${id}`),
  emitirPOS: (data) => api.post('/invoices/pos', data),
  emitirFE: (data) => api.post('/invoices', data),
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

// ---- Panel profesional ----
export const profesionalApi = {
  listarTickets: (params)        => api.get('/profesional/tickets', { params }),
  obtenerTicket: (id)            => api.get(`/profesional/tickets/${id}`),
  actualizarTicket: (id, data)   => api.patch(`/profesional/tickets/${id}`, data),
  responder: (id, contenido, es_interno = false) =>
    api.post(`/profesional/tickets/${id}/mensajes`, { contenido, es_interno }),
  resumenEmpresa: (empresa_id)   => api.get(`/profesional/empresa/${empresa_id}/resumen`),
  listarProfesionales: ()        => api.get('/profesional/profesionales'),
}
