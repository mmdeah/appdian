const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const supabase = require('../config/db')

// POST /api/auth/register — Registrar nueva empresa
const register = async (req, res) => {
  const { nombre_empresa, nit, email, password, direccion, telefono } = req.body

  try {
    const { data: existe } = await supabase
      .from('empresas')
      .select('id')
      .eq('nit', nit)
      .single()

    if (existe) return res.status(400).json({ error: 'Ya existe una empresa con ese NIT' })

    const hash = await bcrypt.hash(password, 10)

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

    if (!empresa.activo) return res.status(403).json({ error: 'Cuenta desactivada' })

    const token = generarToken(empresa)
    res.json({ token, empresa: sanitizar(empresa) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/auth/google — Login / registro con Google via Supabase
const googleAuth = async (req, res) => {
  const { access_token } = req.body
  if (!access_token) return res.status(400).json({ error: 'access_token requerido' })

  try {
    // Verificar token con Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(access_token)
    if (authError || !user) return res.status(401).json({ error: 'Token de Google inválido' })

    const email = user.email
    const nombre = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0]

    // Buscar empresa existente
    let { data: empresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('email', email)
      .single()

    if (!empresa) {
      // Crear empresa nueva con datos de Google
      const hash = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10)
      const { data: nueva, error: createError } = await supabase
        .from('empresas')
        .insert({
          nombre,
          email,
          nit: `G-${Date.now()}`, // NIT temporal — el usuario puede actualizarlo después
          password: hash,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creando empresa Google:', createError)
        return res.status(500).json({ error: 'Error al crear cuenta' })
      }
      empresa = nueva
    }

    if (!empresa.activo) return res.status(403).json({ error: 'Cuenta desactivada' })

    const token = generarToken(empresa)
    res.json({ token, empresa: sanitizar(empresa) })
  } catch (err) {
    console.error('googleAuth error:', err)
    res.status(500).json({ error: 'Error interno del servidor' })
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

    res.json({ empresa: sanitizar(empresa) })
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

module.exports = { register, login, googleAuth, me }
