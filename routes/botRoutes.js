// routes/botRoutes.js
const express = require('express');
const router  = express.Router();

const {
  procesarEtapa,
  crearLead,
  buscarLeadByPhoneInstance
} = require('../controllers/botController');

//!!! NO incluir '/bot' aquí, se monta en server.js con app.use('/bot', botRoutes)

// POST  /bot/etapa
router.post('/etapa', procesarEtapa);

// POST  /bot/lead
router.post('/lead', crearLead);

// GET   /bot/lead?telefono=…&instancia_evolution_api=…
router.get('/lead', buscarLeadByPhoneInstance);

module.exports = router;
