const router = require('express').Router()
const { emitirPOS, emitirFacturaElectronica, listar, obtener, dashboard } = require('../controllers/invoiceController')
const auth = require('../middleware/auth')

router.use(auth)
router.get('/dashboard', dashboard)
router.get('/', listar)
router.get('/:id', obtener)
router.post('/pos', emitirPOS)
router.post('/', emitirFacturaElectronica)

module.exports = router
