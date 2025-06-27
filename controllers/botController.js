// controllers/botController.js

const { preprocessPayload } = require('./handlers/preprocessPayload');
const { acortarLinks }      = require('./handlers/acortarLinks');
const { handleMensaje }     = require('./handlers/handleMensaje');
const { handleEtapa }       = require('./handlers/handleEtapa');
const { sendResponse }      = require('./handlers/sendResponse');

const {
  upsertLead,
  findLeadByPhoneAndInstance
} = require('../services/leadService');

/**
 * POST /bot/etapa
 * — Enriquecer payload
 * — Guardar/actualizar lead
 * — Acortar links
 * — Procesar mensaje o etapa
 */
exports.procesarEtapa = async (req, res) => {
  try {
    // 1) Enriquecer payload
    const payload = preprocessPayload(req.body);
    console.log('[botController] procesarEtapa payload enriched:', payload);

    // 2) Guardar o actualizar lead en CRM
    const { leadId, userId, isNew } = await upsertLead(payload);
    console.log(`[botController] upsertLead → leadId=${leadId}, userId=${userId}, isNew=${isNew}`);

    // 3) Acortar URLs si toca
    await acortarLinks(payload);

    // 4) Mensaje directo?
    if (payload.mensaje) {
      const html = handleMensaje(payload);
      return res.json({
        success: true,
        data: { texto_html: html, payload_original: payload }
      });
    }

    // 5) Procesar etapa completa
    const result = await handleEtapa(payload);
    return sendResponse(res, result, payload);

  } catch (err) {
    console.error('❌ Error en procesarEtapa:', err);
    const status  = err.status  || 500;
    const message = err.message || 'Error interno del servidor';
    return res.status(status).json({ success: false, error: message });
  }
};

/**
 * POST /bot/lead
 * Upsert de lead según telefono+instancia
 */
exports.crearLead = async (req, res) => {
  try {
    let incoming = req.body;
    if (incoming.body && typeof incoming.body === 'object' && Object.keys(incoming.body).length) {
      incoming = incoming.body;
    } else if (typeof incoming.body === 'string') {
      try { incoming = JSON.parse(incoming.body); } catch {}
    }

    console.log('[botController] crearLead payload:', incoming);

    const { user_id, telefono, dominio, instancia_evolution_api } = incoming;
    if (!user_id || !telefono || !instancia_evolution_api) {
      return res.status(400).json({
        success: false,
        error: 'Campos obligatorios: user_id, telefono e instancia_evolution_api'
      });
    }

    const { leadId, userId, isNew } = await upsertLead(incoming);
    console.log(`[botController] crearLead → leadId=${leadId}, userId=${userId}, isNew=${isNew}`);
    return res.json({ success: true, lead_id: leadId, user_id: userId, isNew });

  } catch (err) {
    console.error('❌ Error en crearLead:', err);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

/**
 * GET /bot/lead?telefono=…&instancia_evolution_api=…
 */
exports.buscarLeadByPhoneInstance = async (req, res) => {
  try {
    const { telefono, instancia_evolution_api } = req.query;
    if (!telefono || !instancia_evolution_api) {
      return res.status(400).json({
        success: false,
        error: 'Query params obligatorios: telefono e instancia_evolution_api'
      });
    }

    console.log('[botController] buscarLeadByPhoneInstance query:', req.query);
    const lead = await findLeadByPhoneAndInstance(telefono, instancia_evolution_api);
    if (!lead) {
      console.log('[botController] buscarLeadByPhoneInstance → no encontrado');
      return res.status(404).json({ success: false, error: 'Lead no encontrado' });
    }
    console.log('[botController] buscarLeadByPhoneInstance → encontrado:', lead);
    return res.json({ success: true, data: lead });

  } catch (err) {
    console.error('❌ Error en buscarLeadByPhoneInstance:', err);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
