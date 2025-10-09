// controllers/botController.js

const { preprocessPayload } = require('./handlers/preprocessPayload');
const { acortarLinks }      = require('./handlers/acortarLinks');
const { handleMensaje }     = require('./handlers/handleMensaje');
const { handleEtapa }       = require('./handlers/handleEtapa');
const { sendResponse }      = require('./handlers/sendResponse');

const {
  upsertLead,
  addLeadStage,
  findLeadByPhoneAndInstance,
} = require('../services/leadService');

/**
 * POST /bot/etapa
 * - Si llega "mensaje": se interpola y retorna HTML directo (sin etapa).
 * - Si llega "texto_html": override del HTML de la etapa (se usa ese, no DB).
 * - Flujo normal (sin "mensaje"): acortar enlaces → obtener etapa → elegir textos
 *   → interpolar → TTS → fusionar → imagen → respuesta.
 */
exports.procesarEtapa = async (req, res) => {
  try {
    // 1) Enriquecer payload (normaliza nombre/apellido, fecha legible, etc.)
    const payload = preprocessPayload(req.body);

    // 2) Acortar enlaces si aplica (se hace SOLO aquí para evitar doble acortado)
    await acortarLinks(payload);

    // 3) Si es mensaje directo, responder sin tocar lead
    if (payload.mensaje) {
      const html = handleMensaje(payload); // función pura: devuelve string
      return res.json({
        success: true,
        data: { texto_html: html, payload_original: payload },
      });
    }

    // 4) Flujo de ETAPA: upsert lead (si hay datos mínimos) + registrar etapa (de forma tolerante)
    const canUpsertLead = Boolean(payload.telefono && payload.instancia_evolution_api);
    let leadId = null;

    if (canUpsertLead) {
      try {
        const upsert = await upsertLead(payload);
        leadId = upsert?.leadId ?? null;

        if (leadId && payload.etapa) {
          try {
            await addLeadStage(leadId, payload.etapa, {
              ...payload,
              etapaRegistradaEn: new Date().toISOString(),
            });
          } catch (e) {
            // No rompemos el flujo si registrar la etapa falla
            console.warn('⚠️ addLeadStage falló pero continuamos:', e?.code || e?.message || e);
          }
        }
      } catch (e) {
        // Hotfix: NO rompemos el endpoint si el upsert falla
        console.warn('⚠️ upsertLead falló pero continuamos:', e?.code || e?.message || e);
      }
    } else {
      console.warn('⚠️ Saltando upsertLead/addLeadStage: faltan telefono o instancia_evolution_api');
    }

    // 5) Procesar etapa completa → HTML + audio + imagen
    const result = await handleEtapa(payload);
    return sendResponse(res, result, payload);
  } catch (err) {
    console.error('❌ Error en procesarEtapa:', err);
    const status = err.status || 500;
    const message = err.message || 'Error interno del servidor';
    return res.status(status).json({ success: false, error: message });
  }
};

/**
 * POST /bot/lead
 * Crea o actualiza lead. Requiere: user_id, telefono, instancia_evolution_api
 */
exports.crearLead = async (req, res) => {
  try {
    const incoming = req.body || {};
    const { user_id, telefono, instancia_evolution_api } = incoming;

    if (!user_id || !telefono || !instancia_evolution_api) {
      return res.status(400).json({
        success: false,
        error: 'Campos obligatorios: user_id, telefono e instancia_evolution_api',
      });
    }

    const { leadId } = await upsertLead(incoming);
    return res.json({ success: true, lead_id: leadId });
  } catch (err) {
    console.error('❌ Error en crearLead:', err);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

/**
 * GET /bot/lead
 * Busca lead por teléfono e instancia_evolution_api
 */
exports.buscarLeadByPhoneInstance = async (req, res) => {
  try {
    const { telefono, instancia_evolution_api } = req.query;
    if (!telefono || !instancia_evolution_api) {
      return res.status(400).json({
        success: false,
        error: 'Query params obligatorios: telefono e instancia_evolution_api',
      });
    }

    const lead = await findLeadByPhoneAndInstance(telefono, instancia_evolution_api);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead no encontrado' });
    }
    return res.json({ success: true, data: lead });
  } catch (err) {
    console.error('❌ Error en buscarLeadByPhoneInstance:', err);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
