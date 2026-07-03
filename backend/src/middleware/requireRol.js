// Middleware de verificación de rol
// Usar DESPUÉS de authMiddleware
const requireRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.rol)) {
    return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' })
  }
  next()
}

module.exports = requireRol
