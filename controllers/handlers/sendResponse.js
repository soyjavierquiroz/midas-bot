// controllers/handlers/sendResponse.js

/**
 * Envía la respuesta estándar de /bot/etapa.
 *
 * @param {import('express').Response} res
 * @param {{ textoHtml: string, audioFusionado: Buffer | null, imagenBase64: string }} result
 * @param {object} payload - Payload original recibido.
 * @returns {import('express').Response}
 */
function sendResponse(res, result, payload) {
  try {
    const { textoHtml, audioFusionado, imagenBase64 } = result;
    const audioBase64 = audioFusionado ? audioFusionado.toString('base64') : null;

    const response = {
      success: true,
      data: {
        imagen_base64_puro: imagenBase64,
        texto_html:         textoHtml,
        audio_base64_puro:  audioBase64,
        payload_original:   payload
      }
    };

    console.log('✅ sendResponse:', {
      imagen_len: imagenBase64?.length || 0,
      texto_html_len: textoHtml.length,
      audio_base64_len: audioBase64?.length || 0
    });

    return res.json(response);
  } catch (err) {
    console.error('❌ Error en sendResponse:', err);
    return res.status(500).json({
      success: false,
      error: 'Error al enviar la respuesta'
    });
  }
}

module.exports = { sendResponse };
