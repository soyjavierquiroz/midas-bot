// routes/botRoutes.js

const express = require('express');
const router  = express.Router();

const {
  procesarEtapa,           // POST /bot/etapa  → flujo completo (o store-only si ?only=save)
  crearLead,               // POST /bot/lead   → store-only (guardar/actualizar)
  buscarLeadByPhoneAndInstance, // GET /bot/lead → consulta por telefono + instancia
} = require('../controllers/botController');

// Healthcheck bajo /bot (además del /health global en server.js)
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Proceso completo (guardar + etapa + acortar + TTS + imagen)
// Nota: si envías ?only=save o { "solo_guardar": true }, hará solo store-only
router.post('/etapa', procesarEtapa);

// Store-only: inserta/actualiza el lead y no hace nada más
router.post('/lead', crearLead);

// Consulta de lead por telefono + instancia_evolution_api
router.get('/lead', buscarLeadByPhoneAndInstance);

module.exports = router;
