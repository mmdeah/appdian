const router = require('express').Router()
const { listar, resumen, crear, actualizar, eliminar } = require('../controllers/cajaMenorController')
const auth = require('../middleware/auth')

router.use(auth)
router.get('/resumen', resumen)
router.get('/',        listar)
router.post('/',       crear)
router.put('/:id',     actualizar)
router.delete('/:id',  eliminar)

module.exports = router
