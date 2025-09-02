// controllers/handlers/handleMensaje.js

const { reemplazarVariables } = require('../../utils/textUtils');

/**
 * Maneja el caso de payload con 'mensaje' (sin etapa).
 * - NO acorta enlaces aquí (ya se hace en botController).
 * - Solo reemplaza variables y devuelve el HTML resultante.
 *
 * @param {object} payload  - Objeto con datos del request.
 * @returns {string} HTML interpolado
 */
function handleMensaje(payload) {
  if (!payload || typeof payload.mensaje !== 'string') {
    return '';
  }
  return reemplazarVariables(payload.mensaje, payload);
}

module.exports = { handleMensaje };
