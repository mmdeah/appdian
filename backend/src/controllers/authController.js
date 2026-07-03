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

    // Crear usuario en Supabase Auth — esto dispara el correo de confirmación
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    })
    if (authError) throw new Error(authError.message)

    const hash = await bcrypt.hash(password, 10)
    const { data: empresa, error } = await supabase
      .from('empresas')
      .insert({
        nombre: nombre_empresa,
        nit,
        email,
        password: hash,
        direccion,
        telefono,
        email_confirmado: false,
        supabase_auth_id: authData.user.id,
      })
      .select().single()

    if (error) {
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {})
      throw error
    }

    audit.log({ tipo: 'REGISTRO_EMPRESA', descripcion: `Nueva empresa registrada: ${nombre_empresa} (NIT ${nit})`, empresa_id: empresa.id })
    res.status(201).json({ pendiente: true, mensaje: 'Revisa tu correo para confirmar tu cuenta' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/auth/confirmar-email ────────────────────────────────────────────
// Recibe el access_token de Supabase tras confirmar el email
const confirmarEmail = async (req, res) => {
  const { access_token } = req.body
  if (!access_token) return res.status(400).json({ error: 'access_token requerido' })
  try {
    const { data: { user }, error } = await supabase.auth.getUser(access_token)
    if (error || !user) return res.status(401).json({ error: 'Token inválido o expirado' })

    const { data: empresa, error: updateError } = await supabase
      .from('empresas')
      .update({ email_confirmado: true })
      .eq('email', user.email)
      .select().single()

    if (updateError || !empresa) return res.status(404).json({ error: 'Empresa no encontrada' })
    if (!empresa.activo) return res.status(403).json({ error: 'Cuenta desactivada' })

    const token = generarTokenEmpresa(empresa)
    res.json({ token, empresa: sanitizarEmpresa(empresa), rol: 'EMPRESA' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ── POST /api/auth/actualizar-password ───────────────────────────────────────
// Actualiza la contraseña tras un reset (recibe token de Supabase + nueva clave)
const actualizarPassword = async (req, res) => {
  const { access_token, nueva_password } = req.body
  if (!access_token || !nueva_password)
    return res.status(400).json({ error: 'access_token y nueva_password requeridos' })
  if (nueva_password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })
  try {
    const { data: { user }, error } = await supabase.auth.getUser(access_token)
    if (error || !user) return res.status(401).json({ error: 'Token inválido o expirado' })

    // Actualizar contraseña en Supabase Auth
    await supabase.auth.admin.updateUserById(user.id, { password: nueva_password })

    // Actualizar hash bcrypt en nuestra tabla
    const hash = await bcrypt.hash(nueva_password, 10)
    await supabase.from('empresas').update({ password: hash }).eq('email', user.email)

    res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' })
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
      // email_confirmado puede ser null en cuentas antiguas — solo bloquear si es explícitamente false
      if (empresa.email_confirmado === false)
        return res.status(403).json({ error: 'email_no_confirmado' })
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

module.exports = { register, login, confirmarEmail, actualizarPassword, me }
