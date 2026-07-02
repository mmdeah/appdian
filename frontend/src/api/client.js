import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://appdian-production.up.railway.app'

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
      localStorage.removeItem('appdian_empresa')
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

// ---- Invoices ----
export const invoicesApi = {
  dashboard: () => api.get('/invoices/dashboard'),
  list: (params) => api.get('/invoices', { params }),
  get: (id) => api.get(`/invoices/${id}`),
  emitirPOS: (data) => api.post('/invoices/pos', data),
  emitirFE: (data) => api.post('/invoices', data),
}
