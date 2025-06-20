// controllers/botController.js

const { preprocessPayload } = require('./handlers/preprocessPayload');
const { handleMensaje }     = require('./handlers/handleMensaje');
const { handleEtapa }       = require('./handlers/handleEtapa');
const { sendResponse }      = require('./handlers/sendResponse');

/**
 * Controlador principal: orquesta el flujo de /bot/etapa
 */
exports.procesarEtapa = async (req, res) => {
  try {
    // 1) Pre-procesar payload (validar/enriquecer fechas)
    const payload = preprocessPayload(req.body);

    // 2) Rama de mensaje directo (sin etapa)
    if (payload.mensaje) {
      return await handleMensaje(payload, res);
    }

    // 3) Rama de etapa: obtiene { textoHtml, audioFusionado, imagenBase64 }
    const result = await handleEtapa(payload);

    // 4) Enviar respuesta final
    return sendResponse(res, result, payload);

  } catch (err) {
    console.error('❌ Error en procesarEtapa:', err);
    const status  = err.status  || 500;
    const message = err.message || 'Error interno del servidor';
    return res.status(status).json({ success: false, error: message });
  }
};
