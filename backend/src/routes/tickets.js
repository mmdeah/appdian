const express    = require('express')
const multer     = require('multer')
const router     = express.Router()
const auth       = require('../middleware/auth')
const requireRol = require('../middleware/requireRol')
const ctrl       = require('../controllers/ticketsController')

// Multer: almacenamiento en memoria (buffer), límite 10 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]
    cb(null, allowed.includes(file.mimetype))
  },
})

router.use(auth, requireRol('EMPRESA'))

router.post('/',                          ctrl.crear)
router.get('/',                           ctrl.listar)
router.get('/:id',                        ctrl.obtener)
router.post('/:id/mensajes',              ctrl.enviarMensaje)
router.post('/:id/archivos', upload.single('archivo'), ctrl.subirArchivo)

module.exports = router
