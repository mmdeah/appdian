const router = require('express').Router()
const { register, login, me, actualizarEmpresa } = require('../controllers/authController')
const auth = require('../middleware/auth')

router.post('/register',  register)
router.post('/login',     login)
router.get('/me',         auth, me)
router.patch('/empresa',  auth, actualizarEmpresa)

module.exports = router
