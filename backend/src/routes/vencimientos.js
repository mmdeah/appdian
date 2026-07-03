const express    = require('express')
const router     = express.Router()
const auth       = require('../middleware/auth')
const requireRol = require('../middleware/requireRol')
const ctrl       = require('../controllers/vencimientosController')

router.use(auth, requireRol('EMPRESA'))

router.get('/', ctrl.listar)

module.exports = router
