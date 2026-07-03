const router = require('express').Router()
const { register, login, confirmarEmail, actualizarPassword, me } = require('../controllers/authController')
const auth = require('../middleware/auth')

router.post('/register',            register)
router.post('/login',               login)
router.post('/confirmar-email',     confirmarEmail)
router.post('/actualizar-password', actualizarPassword)
router.get('/me',                   auth, me)

module.exports = router
