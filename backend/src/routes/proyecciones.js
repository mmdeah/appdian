const express    = require('express')
const router     = express.Router()
const auth       = require('../middleware/auth')
const requireRol = require('../middleware/requireRol')
const ctrl       = require('../controllers/proyeccionesController')

router.use(auth, requireRol('EMPRESA'))

router.get('/', ctrl.resumen)

module.exports = router
