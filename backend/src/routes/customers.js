const router = require('express').Router()
const { listar, crear, actualizar, eliminar } = require('../controllers/customerController')
const auth = require('../middleware/auth')

router.use(auth)
router.get('/', listar)
router.post('/', crear)
router.put('/:id', actualizar)
router.delete('/:id', eliminar)

module.exports = router
