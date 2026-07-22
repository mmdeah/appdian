const router = require('express').Router()
const auth   = require('../middleware/auth')
const {
  resumen, tendencia, topClientes, topProductos, aiAnalisis, chatGeneral, reporteIA, pyg,
} = require('../controllers/statsController')

router.use(auth)

router.get('/resumen',        resumen)
router.get('/tendencia',      tendencia)
router.get('/top-clientes',   topClientes)
router.get('/top-productos',  topProductos)
router.post('/ai',            aiAnalisis)
router.post('/chat-general',  chatGeneral)
router.post('/reporte-ia',    reporteIA)
router.get('/pyg',            pyg)

module.exports = router
