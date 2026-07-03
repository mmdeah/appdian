// Middleware de verificación de rol — usar DESPUÉS de authMiddleware
const requireRol = (...roles) => (req, res, next) => {
  // Retrocompatibilidad: tokens antiguos no tienen campo `rol`.
  // Inferimos el rol por los campos presentes en el payload.
  const rol = req.user?.rol
    || (req.user?.empresa_id     ? 'EMPRESA'      : null)
    || (req.user?.profesional_id ? 'PROFESIONAL'  : null)

  if (!roles.includes(rol)) {
    return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' })
  }
  req.user.rol = rol   // garantizar que siempre esté presente
  next()
}

module.exports = requireRol
