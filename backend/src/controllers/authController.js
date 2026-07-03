const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const supabase = require('../config/db')
const audit   = require('../services/auditService')

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
  const { password, password_cifrada, matias_password, ...rest } = e
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
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })

    const { data: nitExiste } = await supabase.from('empresas').select('id').eq('nit', nit).single()
    if (nitExiste) return res.status(400).json({ error: 'Ya existe una empresa con ese NIT' })

    const { data: emailExiste } = await supabase.from('empresas').select('id').eq('email', email).single()
    if (emailExiste) return res.status(400).json({ error: 'Ya existe una cuenta con ese correo' })

    const hash = await bcrypt.hash(password, 10)
    const { data: empresa, error } = await supabase
      .from('empresas')
      .insert({ nombre: nombre_empresa, nit, email, password: hash, direccion, telefono })
      .select().single()

    if (error) throw error

    audit.log({ tipo: 'REGISTRO_EMPRESA', descripcion: `Nueva empresa registrada: ${nombre_empresa} (NIT ${nit})`, empresa_id: empresa.id })
    const token = generarTokenEmpresa(empresa)
    res.status(201).json({ token, empresa: sanitizarEmpresa(empresa), rol: 'EMPRESA' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body
  try {
    // 1. Buscar en empresas
    const { data: empresa } = await supabase.from('empresas').select('*').eq('email', email).single()
    if (empresa) {
      const valido = await bcrypt.compare(password, empresa.password)
      if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' })
      if (!empresa.activo) return res.status(403).json({ error: 'Cuenta desactivada' })
      audit.log({ tipo: 'LOGIN_EMPRESA', descripcion: `Inicio de sesión: ${empresa.nombre} (${empresa.email})`, empresa_id: empresa.id })
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

module.exports = { register, login, me }
