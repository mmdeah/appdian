require('dotenv').config()
const express = require('express')
const path    = require('path')
const morgan  = require('morgan')

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

const app = express()

app.use(express.json())
app.use(morgan('dev'))

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'))
app.use('/api/products',    require('./routes/products'))
app.use('/api/customers',   require('./routes/customers'))
app.use('/api/invoices',    require('./routes/invoices'))
app.use('/api/stats',       require('./routes/stats'))
app.use('/api/tickets',        require('./routes/tickets'))
app.use('/api/profesional',    require('./routes/profesional'))
app.use('/api/proyecciones',   require('./routes/proyecciones'))
app.use('/api/vencimientos',   require('./routes/vencimientos'))
app.use('/api/nomina',         require('./routes/nomina'))
app.use('/api/gastos',         require('./routes/gastos'))
app.use('/api/caja-menor',     require('./routes/cajaMenor'))
app.use('/api/inventario',     require('./routes/inventario'))

app.get('/health', (_, res) => res.json({ ok: true, v: 7 }))

// ── Serve React frontend ─────────────────────────────────────────────────────
// __dirname = /app/src  →  ../public = /app/public
const PUBLIC = path.join(__dirname, '../public')
app.use(express.static(PUBLIC))

// SPA fallback — React Router handles client-side navigation
app.get('*', (_, res) => res.sendFile(path.join(PUBLIC, 'index.html')))

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`AppDian Backend v6 corriendo en puerto ${PORT}`))
