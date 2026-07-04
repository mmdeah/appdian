const router = require('express').Router()
const { resumenDia, historial, registrarCierre } = require('../controllers/cajaDiariaController')
const auth = require('../middleware/auth')

router.use(auth)
router.get('/historial', historial)
router.get('/',          resumenDia)
router.post('/cierre',   registrarCierre)

module.exports = router
