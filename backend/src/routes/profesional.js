const express    = require('express')
const multer     = require('multer')
const router     = express.Router()
const auth       = require('../middleware/auth')
const requireRol = require('../middleware/requireRol')
const ctrl = require('../controllers/profesionalController')
const { subirArchivo } = require('../controllers/ticketsController')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ]
    cb(null, allowed.includes(file.mimetype))
  },
})

router.use(auth, requireRol('PROFESIONAL'))

router.get('/tickets',                          ctrl.listarTickets)
router.get('/tickets/:id',                      ctrl.obtenerTicket)
router.patch('/tickets/:id',                    ctrl.actualizarTicket)
router.post('/tickets/:id/mensajes',            ctrl.enviarMensaje)
router.post('/tickets/:id/archivos', upload.single('archivo'), subirArchivo)
router.get('/empresa/:id/resumen',              ctrl.resumenEmpresa)
router.get('/empresa/:id/ver-password',         ctrl.verPasswordEmpresa)
router.get('/empresa/:id/acceso',               ctrl.accesoEmpresa)
router.get('/profesionales',                    ctrl.listarProfesionales)
router.get('/empresas',                         ctrl.listarEmpresas)
router.patch('/empresas/:id',                   ctrl.actualizarEmpresa)
router.delete('/empresas/:id',                  ctrl.eliminarEmpresa)
router.get('/audit',                            ctrl.listarAudit)

module.exports = router
