const router = require('express').Router()
const auth   = require('../middleware/auth')
const {
  resumen, tendencia, topClientes, topProductos, aiAnalisis, reporteIA,
} = require('../controllers/statsController')

router.use(auth)

router.get('/resumen',       resumen)
router.get('/tendencia',     tendencia)
router.get('/top-clientes',  topClientes)
router.get('/top-productos', topProductos)
router.post('/ai',           aiAnalisis)
router.post('/reporte-ia',   reporteIA)

module.exports = router
