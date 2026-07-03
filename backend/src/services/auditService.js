const supabase = require('../config/db')

/**
 * Registra un evento en el audit_log.
 * Nunca lanza excepciones — el log nunca debe interrumpir la lógica de negocio.
 *
 * @param {object} opts
 * @param {string} opts.tipo           - Tipo de evento (ej: 'LOGIN_EMPRESA')
 * @param {string} opts.descripcion    - Descripción legible del evento
 * @param {string} [opts.empresa_id]   - UUID de la empresa involucrada
 * @param {string} [opts.profesional_id] - UUID del profesional (si aplica)
 */
async function log({ tipo, descripcion, empresa_id = null, profesional_id = null }) {
  try {
    await supabase.from('audit_log').insert({
      tipo,
      descripcion,
      empresa_id:    empresa_id    || null,
      profesional_id: profesional_id || null,
    })
  } catch (err) {
    console.error('[AuditService] Error al registrar evento:', err.message)
  }
}

module.exports = { log }
