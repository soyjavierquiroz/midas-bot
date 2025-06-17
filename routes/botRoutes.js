const express = require('express');
const router = express.Router();
const { procesarEtapa } = require('../controllers/botController');

// POST /bot/etapa
router.post('/etapa', procesarEtapa);

module.exports = router;
