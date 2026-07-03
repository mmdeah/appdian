const express    = require('express')
const router     = express.Router()
const auth       = require('../middleware/auth')
const requireRol = require('../middleware/requireRol')
const ctrl       = require('../controllers/profesionalController')

// Solo profesionales (contadores/abogados) acceden a este panel
router.use(auth, requireRol('PROFESIONAL'))

router.get('/tickets',                     ctrl.listarTickets)
router.get('/tickets/:id',                 ctrl.obtenerTicket)
router.patch('/tickets/:id',               ctrl.actualizarTicket)
router.post('/tickets/:id/mensajes',       ctrl.enviarMensaje)
router.get('/empresa/:id/resumen',         ctrl.resumenEmpresa)
router.get('/profesionales',               ctrl.listarProfesionales)

module.exports = router
