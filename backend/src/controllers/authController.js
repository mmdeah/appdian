const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const supabase = require('../config/db')
const { cifrar } = require('../services/cifradoService')

// ── Helpers ───────────────────────────────────────────────────────────────────
function generarTokenEmpresa(empresa) {
  return jwt.sign(
    { empresa_id: empresa.id, email: empresa.email, nit: empresa.nit, rol: 'EMPRESA' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function generarTokenProfesional(prof) {
  return jwt.sign(
    { profesional_id: prof.id, email: prof.email, especialidad: prof.especialidad, rol: 'PROFESIONAL' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function sanitizarEmpresa(e) {
  const { password, matias_password, ...rest } = e
  return rest
}

function sanitizarProfesional(p) {
  const { password, ...rest } = p
  return rest
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res) => {
  const { nombre_empresa, nit, email, password, direccion, telefono } = req.body
  try {
    const { data: existe } = await supabase.from('empresas').select('id').eq('nit', nit).single()
    if (existe) return res.status(400).json({ error: 'Ya existe una empresa con ese NIT' })

    const hash            = await bcrypt.hash(password, 10)
    const password_cifrada = cifrar(password)   // copia reversible para soporte profesional
    const { data: empresa, error } = await supabase
      .from('empresas')
      .insert({ nombre: nombre_empresa, nit, email, password: hash, password_cifrada, direccion, telefono })
      .select().single()

    if (error) throw error
    const token = generarTokenEmpresa(empresa)
    res.status(201).json({ token, empresa: sanitizarEmpresa(empresa), rol: 'EMPRESA' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
// Intenta empresas primero, luego profesionales
const login = async (req, res) => {
  const { email, password } = req.body
  try {
    // 1. Buscar en empresas
    const { data: empresa } = await supabase.from('empresas').select('*').eq('email', email).single()
    if (empresa) {
      const valido = await bcrypt.compare(password, empresa.password)
      if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' })
      if (!empresa.activo) return res.status(403).json({ error: 'Cuenta desactivada' })
      const token = generarTokenEmpresa(empresa)
      return res.json({ token, empresa: sanitizarEmpresa(empresa), rol: 'EMPRESA' })
    }

    // 2. Buscar en profesionales
    const { data: prof } = await supabase.from('profesionales').select('*').eq('email', email).single()
    if (prof) {
      const valido = await bcrypt.compare(password, prof.password)
      if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' })
      if (!prof.activo) return res.status(403).json({ error: 'Cuenta desactivada' })
      const token = generarTokenProfesional(prof)
      return res.json({ token, profesional: sanitizarProfesional(prof), rol: 'PROFESIONAL' })
    }

    return res.status(401).json({ error: 'Credenciales inválidas' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/auth/google ─────────────────────────────────────────────────────
const googleAuth = async (req, res) => {
  const { access_token } = req.body
  if (!access_token) return res.status(400).json({ error: 'access_token requerido' })
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(access_token)
    if (authError || !user) return res.status(401).json({ error: 'Token de Google inválido' })

    const email = user.email
    const nombre = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0]

    let { data: empresa } = await supabase.from('empresas').select('*').eq('email', email).single()
    if (!empresa) {
      const hash = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10)
      const { data: nueva, error: createError } = await supabase
        .from('empresas')
        .insert({ nombre, email, nit: `G-${Date.now()}`, password: hash })
        .select().single()
      if (createError) return res.status(500).json({ error: 'Error al crear cuenta' })
      empresa = nueva
    }
    if (!empresa.activo) return res.status(403).json({ error: 'Cuenta desactivada' })
    const token = generarTokenEmpresa(empresa)
    res.json({ token, empresa: sanitizarEmpresa(empresa), rol: 'EMPRESA' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const me = async (req, res) => {
  try {
    if (req.user.rol === 'PROFESIONAL') {
      const { data: prof } = await supabase
        .from('profesionales').select('*').eq('id', req.user.profesional_id).single()
      return res.json({ profesional: sanitizarProfesional(prof), rol: 'PROFESIONAL' })
    }
    const { data: empresa } = await supabase
      .from('empresas').select('*').eq('id', req.user.empresa_id).single()
    res.json({ empresa: sanitizarEmpresa(empresa), rol: 'EMPRESA' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { register, login, googleAuth, me }
