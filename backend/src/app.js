require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const path = require('path')

const app = express()

app.use(express.json())
app.use(morgan('dev'))

// ── API ───────────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'))
app.use('/api/products',  require('./routes/products'))
app.use('/api/customers', require('./routes/customers'))
app.use('/api/invoices',  require('./routes/invoices'))

app.get('/health', (_, res) => res.json({ ok: true, v: 4 }))

// ── Frontend estático (mismo origen = sin CORS) ────────────────────────────────
const DIST = path.join(__dirname, '../../frontend/dist')
app.use(express.static(DIST))
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')))

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`AppDian Backend corriendo en puerto ${PORT}`))
