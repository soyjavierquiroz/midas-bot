// controllers/handlers/sendResponse.js

/**
 * Ensambla y envía la respuesta final de /bot/etapa
 *
 * @param {object} res     - Express response
 * @param {object} result  - { textoHtml: string, audioFusionado: Buffer|null, imagenBase64: string }
 * @param {object} payload - Payload original recibido
 */
function sendResponse(res, result, payload) {
  const { textoHtml, audioFusionado, imagenBase64 } = result;
  res.json({
    success: true,
    data: {
      imagen_base64_puro: imagenBase64,
      texto_html:         textoHtml,
      audio_base64_puro:  audioFusionado?.toString('base64') || null,
      payload_original:   payload
    }
  });
}

module.exports = { sendResponse };
