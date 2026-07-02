const router = require('express').Router()
const { register, login, googleAuth, me } = require('../controllers/authController')
const auth = require('../middleware/auth')

router.post('/register', register)
router.post('/login', login)
router.post('/google', googleAuth)
router.get('/me', auth, me)

module.exports = router
