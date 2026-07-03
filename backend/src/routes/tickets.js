const express    = require('express')
const router     = express.Router()
const auth       = require('../middleware/auth')
const requireRol = require('../middleware/requireRol')
const ctrl       = require('../controllers/ticketsController')

// Solo empresas pueden gestionar sus tickets
router.use(auth, requireRol('EMPRESA'))

router.post('/',                  ctrl.crear)
router.get('/',                   ctrl.listar)
router.get('/:id',                ctrl.obtener)
router.post('/:id/mensajes',      ctrl.enviarMensaje)

module.exports = router
