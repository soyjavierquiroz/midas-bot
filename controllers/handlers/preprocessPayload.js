// controllers/handlers/preprocessPayload.js

const { generarVariablesFecha }  = require('../../utils/textUtils');
const { normalizeName, normalizeSurname } = require('../../utils/nameUtils');

/**
 * Paso 1: validación mínima, normalización de nombre y apellido,
 * y enriquecimiento de fecha.
 * Recibe el body raw y devuelve payload enriquecido.
 *
 * @param {object} body
 * @returns {object} payload enriquecido
 */
function preprocessPayload(body) {
  // 0) Copia del body para no mutar el original
  const payload = { ...body };

  // 1) Normalizar nombre
  if (typeof payload.nombre === 'string') {
    const before = payload.nombre;
    const after  = normalizeName(before);
    console.log(`🔄 Normalizando nombre: "${before}" → "${after}"`);
    payload.nombre = after;
  }

  // 2) Normalizar apellido
  if (typeof payload.apellido === 'string') {
    const before = payload.apellido;
    const after  = normalizeSurname(before);
    console.log(`🔄 Normalizando apellido: "${before}" → "${after}"`);
    payload.apellido = after;
  }

  // 3) Log del payload recibido
  console.log('📥 Payload recibido:', payload);

  // 4) Enriquecer con fecha legible si llega fecha + zona_horaria
  if (payload.fecha && payload.zona_horaria) {
    const enriquecido = generarVariablesFecha(payload);
    Object.assign(payload, enriquecido);
    console.log('🕒 Variables enriquecidas:', enriquecido);
  }

  return payload;
}

module.exports = { preprocessPayload };
