const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const supabase = require('../config/db')

// POST /api/auth/register — Registrar nueva empresa
const register = async (req, res) => {
  const { nombre_empresa, nit, email, password, direccion, telefono } = req.body

  try {
    // Verificar que el NIT no exista
    const { data: existe } = await supabase
      .from('empresas')
      .select('id')
      .eq('nit', nit)
      .single()

    if (existe) return res.status(400).json({ error: 'Ya existe una empresa con ese NIT' })

    // Hash de la contraseña
    const hash = await bcrypt.hash(password, 10)

    // Crear empresa
    const { data: empresa, error } = await supabase
      .from('empresas')
      .insert({ nombre: nombre_empresa, nit, email, password: hash, direccion, telefono })
      .select()
      .single()

    if (error) throw error

    const token = generarToken(empresa)
    res.status(201).json({ token, empresa: sanitizar(empresa) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body

  try {
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !empresa) return res.status(401).json({ error: 'Credenciales inválidas' })

    const valido = await bcrypt.compare(password, empresa.password)
    if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' })

    const token = generarToken(empresa)
    res.json({ token, empresa: sanitizar(empresa) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/auth/me
const me = async (req, res) => {
  try {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', req.user.empresa_id)
      .single()

    res.json(sanitizar(empresa))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

function generarToken(empresa) {
  return jwt.sign(
    { empresa_id: empresa.id, email: empresa.email, nit: empresa.nit },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function sanitizar(empresa) {
  const { password, matias_password, ...rest } = empresa
  return rest
}

module.exports = { register, login, me }
