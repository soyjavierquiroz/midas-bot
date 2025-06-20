// controllers/handlers/preprocessPayload.js

const { generarVariablesFecha } = require('../../utils/textUtils');

/**
 * Paso 1: validación mínima y enriquecimiento de fecha.
 * Recibe el body raw y devuelve payload enriquecido.
 */
function preprocessPayload(body) {
  const payload = { ...body };
  console.log('📥 Payload recibido:', payload);

  if (payload.fecha && payload.zona_horaria) {
    const enriquecido = generarVariablesFecha(payload);
    Object.assign(payload, enriquecido);
    console.log('🕒 Variables enriquecidas:', enriquecido);
  }

  return payload;
}

module.exports = { preprocessPayload };
