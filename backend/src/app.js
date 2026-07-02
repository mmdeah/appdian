require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const app = express()

// CORS manual — confiable en Railway
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})
app.use(express.json())
app.use(morgan('dev'))

// Rutas
app.use('/api/auth', require('./routes/auth'))
app.use('/api/products', require('./routes/products'))
app.use('/api/customers', require('./routes/customers'))
app.use('/api/invoices', require('./routes/invoices'))

// Health check para Railway
app.get('/health', (_, res) => res.json({ ok: true, env: process.env.NODE_ENV }))

// 404
app.use((_, res) => res.status(404).json({ error: 'Ruta no encontrada' }))

// Error handler
app.use((err, _, res, __) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`AppDian Backend corriendo en puerto ${PORT}`))
