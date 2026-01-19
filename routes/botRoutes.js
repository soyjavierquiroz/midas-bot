// routes/botRoutes.js

const express = require('express');
const router  = express.Router();

const {
  procesarEtapa,   // POST /bot/etapa  → flujo completo (o store-only si ?only=save)
  crearLead,       // POST /bot/lead   → store-only (insert/update; soporta lead_id)
  buscarLead,      // GET  /bot/lead   → consulta por lead_id O por telefono+instancia
} = require('../controllers/botController');

// Healthcheck bajo /bot (además del /health global en server.js)
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// Proceso completo (guardar + etapa + acortar + TTS + imagen)
// Nota: si envías ?only=save o { "solo_guardar": true }, hará solo store-only
router.post('/etapa', procesarEtapa);

// Store-only: inserta/actualiza el lead y no hace nada más
router.post('/lead', crearLead);

// Consulta de lead por lead_id (prioridad) o por telefono + instancia_evolution_api
router.get('/lead', buscarLead);

module.exports = router;
