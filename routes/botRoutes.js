// routes/botRoutes.js

/**
 * Rutas bajo /bot:
 *  - POST /etapa   → procesar flujo de etapa o mensaje
 *  - POST /lead    → crear o actualizar un lead
 *  - GET  /lead    → buscar un lead por teléfono e instancia
 */

const express = require('express');
const router  = express.Router();

const {
  procesarEtapa,
  crearLead,
  buscarLeadByPhoneInstance
} = require('../controllers/botController');

// Procesar etapa o mensaje
router.post('/etapa', procesarEtapa);

// Crear o actualizar lead
router.post('/lead', crearLead);

// Obtener datos de un lead existente
router.get('/lead', buscarLeadByPhoneInstance);

module.exports = router;
