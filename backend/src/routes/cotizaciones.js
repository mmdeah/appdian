const router = require('express').Router()
const auth   = require('../middleware/auth')
const c      = require('../controllers/cotizacionController')

router.use(auth)

router.get('/',             c.listar)
router.post('/',            c.crear)
router.get('/:id',          c.obtener)
router.patch('/:id/estado', c.cambiarEstado)
router.delete('/:id',       c.eliminar)

module.exports = router
