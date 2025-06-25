// routes/botRoutes.js
const express = require('express');
const router  = express.Router();
const { procesarEtapa, crearLead } = require('../controllers/botController');

// POST /bot/etapa
router.post('/etapa', procesarEtapa);

// POST /bot/lead
router.post('/lead', crearLead);

module.exports = router;
