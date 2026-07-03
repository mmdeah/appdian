const router  = require('express').Router()
const auth     = require('../middleware/auth')
const requireRol = require('../middleware/requireRol')
const ctrl     = require('../controllers/gastosController')

router.use(auth, requireRol('EMPRESA'))

router.get('/',           ctrl.listar)
router.post('/',          ctrl.crear)
router.put('/:id',        ctrl.actualizar)
router.delete('/:id',     ctrl.eliminar)

// Dashboard
router.get('/resumen',    ctrl.resumen)
router.get('/flujo',      ctrl.flujo)

module.exports = router
