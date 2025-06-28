// routes/botRoutes.js

const express = require('express');
const router  = express.Router();

const {
  procesarEtapa,
  crearLead,
  buscarLeadByPhoneInstance
} = require('../controllers/botController');

// Healthcheck básico
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Procesar etapa o mensaje
router.post('/etapa', procesarEtapa);

// Crear o actualizar lead independiente
router.post('/lead', crearLead);

// Obtener datos de un lead existente
router.get('/lead', buscarLeadByPhoneInstance);

module.exports = router;
