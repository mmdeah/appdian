const router = require('express').Router()
const { listar, resumen, crear, actualizar, desactivar, movimiento, movimientos } = require('../controllers/inventarioController')
const auth = require('../middleware/auth')

router.use(auth)
router.get('/resumen',            resumen)
router.get('/',                   listar)
router.post('/',                  crear)
router.put('/:id',                actualizar)
router.delete('/:id',             desactivar)
router.post('/:id/movimiento',    movimiento)
router.get('/:id/movimientos',    movimientos)

module.exports = router
