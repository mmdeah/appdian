const jwt      = require('jsonwebtoken')
const supabase  = require('../config/db')

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded   // { id, empresa_id, email, rol, ... }

    // Verificar que la empresa siga activa en la BD
    // (modo_visor es un acceso temporal del profesional, usa su propio token)
    if (decoded.rol === 'EMPRESA' && !decoded.modo_visor) {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('activo')
        .eq('id', decoded.empresa_id)
        .single()

      if (!empresa || !empresa.activo) {
        return res.status(401).json({ error: 'Cuenta desactivada. Contacta con soporte.' })
      }
    }

    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

module.exports = authMiddleware
