const router = require('express').Router()
const { listar, obtener, crear, actualizar, eliminar } = require('../controllers/productController')
const auth = require('../middleware/auth')

router.use(auth)
router.get('/', listar)
router.get('/:id', obtener)
router.post('/', crear)
router.put('/:id', actualizar)
router.delete('/:id', eliminar)

module.exports = router
