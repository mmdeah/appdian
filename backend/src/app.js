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
// En Docker: WORKDIR=/app/backend, __dirname=/app/backend/src → dist en /app/frontend/dist
const DIST = path.resolve(__dirname, '..', '..', 'frontend', 'dist')
console.log('Serving frontend from:', DIST)
app.use(express.static(DIST))
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'), (err) => {
    if (err) res.status(200).send('AppDian cargando...')
  })
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`AppDian Backend corriendo en puerto ${PORT}`))
