require('dotenv').config()
const express = require('express')

// Evitar crash por promesas rechazadas sin manejar (ej: supabase realtime)
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})
const morgan = require('morgan')

const app = express()

// CORS — permite llamadas desde cualquier origen (frontend separado)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Origin,Content-Type,Accept,Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})

app.use(express.json())
app.use(morgan('dev'))

app.use('/api/auth',      require('./routes/auth'))
app.use('/api/products',  require('./routes/products'))
app.use('/api/customers', require('./routes/customers'))
app.use('/api/invoices',  require('./routes/invoices'))

app.get('/health', (_, res) => res.json({ ok: true, v: 5 }))

app.use((_, res) => res.status(404).json({ error: 'Ruta no encontrada' }))

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`AppDian Backend v5 corriendo en puerto ${PORT}`))
