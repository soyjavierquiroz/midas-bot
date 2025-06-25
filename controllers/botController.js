// controllers/botController.js

const { URL }               = require('url');
// Ahora extraemos las funciones directamente de cada módulo:
const { preprocessPayload } = require('./handlers/preprocessPayload');
const { acortarLinks }      = require('./handlers/acortarLinks');
const { handleMensaje }     = require('./handlers/handleMensaje');
const { handleEtapa }       = require('./handlers/handleEtapa');
const { sendResponse }      = require('./handlers/sendResponse');

// Servicio de leads
const { upsertLead }        = require('../services/leadService');

/**
 * POST /bot/etapa
 * Flujo actual de procesar etapa o mensaje directo.
 */
exports.procesarEtapa = async (req, res) => {
  try {
    // 1) Enriquecer payload
    const payload = preprocessPayload(req.body);

    // 2) Acortar URLs si hay placeholders
    await acortarLinks(payload);

    // 3) Si es mensaje directo, solo interpolar y devolver HTML
    if (payload.mensaje) {
      const html = handleMensaje(payload);
      return res.json({
        success: true,
        data: { texto_html: html, payload_original: payload }
      });
    }

    // 4) Procesar etapa completa (texto, audio, imagen)
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
 * Upsert de lead según (telefono, dominio).
 */
exports.crearLead = async (req, res) => {
  try {
    // 1) Extraer payload real (soporte n8n u otros que aniden bajo `body`)
    let incoming = req.body;
    if (incoming && incoming.body) {
      if (typeof incoming.body === 'string' && incoming.body.trim().startsWith('{')) {
        try {
          incoming = JSON.parse(incoming.body);
        } catch (e) {
          console.warn('⚠️ crearLead: no pude parsear incoming.body como JSON', e);
        }
      } else if (typeof incoming.body === 'object' && Object.keys(incoming.body).length) {
        incoming = incoming.body;
      }
    }

    // 2) Validar campos mínimos
    const { user_id, telefono } = incoming;
    if (!user_id || !telefono) {
      return res.status(400).json({
        success: false,
        error: 'Campos obligatorios: user_id y telefono'
      });
    }

    // 3) Inferir dominio si no se envió
    let { dominio } = incoming;
    if (!dominio) {
      if (incoming.fuente) {
        try { dominio = new URL(incoming.fuente).hostname; } catch {}
      }
      if (!dominio && incoming.link) {
        try { dominio = new URL(incoming.link).hostname; } catch {}
      }
      if (!dominio && req.headers.host) {
        dominio = req.headers.host;
      }
    }
    incoming.dominio = dominio;

    // 4) Upsert en la tabla wa_bot_leads
    const { leadId, userId, isNew } = await upsertLead(incoming);

    // 5) Responder
    return res.json({
      success: true,
      lead_id: leadId,
      user_id: userId,
      isNew
    });

  } catch (err) {
    console.error('❌ Error en crearLead:', err);
    const status  = err.status  || 500;
    const message = err.message || 'Error interno del servidor';
    return res.status(status).json({ success: false, error: message });
  }
};
