const crypto = require('crypto')

// ENCRYPTION_KEY debe ser exactamente 32 caracteres en el .env de Railway
const KEY = Buffer.from(
  (process.env.ENCRYPTION_KEY || 'appdian_clave_secreta_32_chars!!').substring(0, 32)
)
const ALGO = 'aes-256-cbc'

function cifrar(texto) {
  const iv   = crypto.randomBytes(16)
  const cif  = crypto.createCipheriv(ALGO, KEY, iv)
  const enc  = Buffer.concat([cif.update(texto, 'utf8'), cif.final()])
  return iv.toString('hex') + ':' + enc.toString('hex')
}

function descifrar(datos) {
  const [ivHex, encHex] = datos.split(':')
  const iv  = Buffer.from(ivHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const dec = crypto.createDecipheriv(ALGO, KEY, iv)
  return Buffer.concat([dec.update(enc), dec.final()]).toString('utf8')
}

module.exports = { cifrar, descifrar }
