// controllers/handlers/handleMensaje.js

const { reemplazarVariables } = require('../../utils/textUtils');
const { acortarLinks }        = require('./acortarLinks');

/**
 * Maneja el caso de payload con 'mensaje' (sin etapa).
 * - Acorta e interpola enlaces.
 * - Reemplaza variables en el mensaje.
 * - Envía la respuesta JSON.
 *
 * @param {object} payload  - Objeto con datos del request.
 * @param {object} res      - Objeto Express response.
 */
async function handleMensaje(payload, res) {
  // 1) Acortar e interpolar cualquier enlace
  await acortarLinks(payload);

  // 2) Reemplazar variables en el texto del mensaje
  const textoHtml = reemplazarVariables(payload.mensaje, payload);

  // 3) Enviar respuesta
  return res.json({
    success: true,
    data: {
      texto_html: textoHtml,
      payload_original: payload
    }
  });
}

module.exports = { handleMensaje };
