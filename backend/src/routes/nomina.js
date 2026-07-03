const express    = require('express')
const router     = express.Router()
const auth       = require('../middleware/auth')
const requireRol = require('../middleware/requireRol')
const ctrl       = require('../controllers/nominaController')

router.use(auth, requireRol('EMPRESA'))

// Empleados
router.get('/empleados',           ctrl.listarEmpleados)
router.post('/empleados',          ctrl.crearEmpleado)
router.put('/empleados/:id',       ctrl.actualizarEmpleado)
router.delete('/empleados/:id',    ctrl.desactivarEmpleado)

// Liquidaciones
router.get('/liquidaciones',          ctrl.listarLiquidaciones)
router.post('/liquidar',              ctrl.liquidar)
router.get('/liquidaciones/:id',      ctrl.obtenerLiquidacion)
router.patch('/liquidaciones/:id/estado', ctrl.cambiarEstado)

// Colilla
router.get('/colilla/:detalleId',  ctrl.colilla)

module.exports = router
