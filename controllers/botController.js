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
  findLeadById, // ← nuevo: búsqueda directa por ID
} = require('../services/leadService');

/**
 * POST /bot/etapa
 * Flujo completo por defecto:
 *  - upsert del lead
 *  - registro de etapa (si viene)
 *  - acortar enlaces (YOURLS)
 *  - mensaje directo (si viene "mensaje")
 *  - procesar etapa (HTML, TTS, fusión, imagen)
 *
 * Modo "solo guardar" (opcional):
 *  - activar con ?only=save o payload.solo_guardar=true
 *  - hace solo upsert y devuelve { lead_id, isNew }, sin TTS/imagen
 */
exports.procesarEtapa = async (req, res) => {
  try {
    // 1) Normalizar/enriquecer payload (nombre, fecha legible, etc.)
    const payload = preprocessPayload(req.body);

    // 1.1) Modo "solo guardar" (sin TTS/imagen), si se solicita explícitamente
    const storeOnly =
      req.query.only === 'save' ||
      payload.solo_guardar === true ||
      payload.solo_guardar === '1' ||
      payload.solo_guardar === 1;

    // 2) Upsert del lead (idempotente)
    const { leadId, userId, isNew } = await upsertLead(payload);

    if (storeOnly) {
      // Salida temprana: solo guardar
      return res.json({
        success: true,
        data: { lead_id: leadId, user_id: userId, isNew, mode: 'store_only' },
      });
    }

    // 3) Registrar la etapa si viene en el payload
    if (payload.etapa) {
      await addLeadStage(leadId, payload.etapa, {
        ...payload,
        etapaRegistradaEn: new Date().toISOString(),
      });
    }

    // 4) Acortar enlaces (zoom/meet/link) si aplica
    await acortarLinks(payload);

    // 5) Mensaje directo: si viene "mensaje", devolvemos ese HTML
    if (payload.mensaje) {
      const html = handleMensaje(payload);
      return res.json({
        success: true,
        data: { texto_html: html, payload_original: payload },
      });
    }

    // 6) Procesar la etapa (HTML, TTS, fusión, imagen)
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
 * Store-only: inserta/actualiza el lead y no hace nada más.
 * - Si llega lead_id → UPDATE por ID (telefono NO es obligatorio)
 * - Si no llega lead_id → requiere (user_id, telefono, instancia_evolution_api)
 */
exports.crearLead = async (req, res) => {
  try {
    // Compatibilidad con n8n: a veces llega { body: {...} } o body como string JSON
    let incoming = req.body;
    if (incoming.body && typeof incoming.body === 'object' && Object.keys(incoming.body).length) {
      incoming = incoming.body;
    } else if (typeof incoming.body === 'string') {
      try { incoming = JSON.parse(incoming.body); } catch { /* noop */ }
    }

    // Normalizar/enriquecer igual que /bot/etapa
    const payload = preprocessPayload(incoming);

    // Validación mínima flexible
    if (!payload.lead_id && (!payload.user_id || !payload.telefono || !payload.instancia_evolution_api)) {
      return res.status(400).json({
        success: false,
        error: 'Campos obligatorios: (lead_id) ó (user_id, telefono, instancia_evolution_api)',
      });
    }

    const { leadId, userId, isNew } = await upsertLead(payload);
    return res.json({
      success: true,
      data: { lead_id: leadId, user_id: userId, isNew, mode: 'store_only' },
    });
  } catch (err) {
    console.error('❌ Error en crearLead:', err);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

/**
 * GET /bot/lead
 * Nueva lógica:
 *  - Si viene lead_id => buscar por ID directamente
 *  - Si NO viene lead_id => compatibilidad: telefono + instancia_evolution_api
 */
exports.buscarLead = async (req, res) => {
  try {
    const { lead_id, telefono, instancia_evolution_api } = req.query;

    if (lead_id) {
      console.log('🔎 buscarLead por lead_id =', lead_id);
      const lead = await findLeadById(lead_id);
      if (!lead) return res.status(404).json({ success: false, error: 'Lead no encontrado' });
      return res.json({ success: true, data: lead });
    }

    // Compatibilidad anterior
    if (!telefono || !instancia_evolution_api) {
      return res.status(400).json({
        success: false,
        error: 'Query params obligatorios: lead_id ó (telefono e instancia_evolution_api)',
      });
    }

    console.log('🔎 buscarLead por telefono+instancia =', telefono, instancia_evolution_api);
    const lead = await findLeadByPhoneAndInstance(telefono, instancia_evolution_api);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead no encontrado' });
    return res.json({ success: true, data: lead });
  } catch (err) {
    console.error('❌ Error en buscarLead:', err);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
