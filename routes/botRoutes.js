const express = require('express');
const router = express.Router();
const { procesarEtapa } = require('../controllers/botController');
const { enriquecerVariablesFecha } = require('../utils/fechaUtils');


// POST /bot/etapa
router.post('/etapa', procesarEtapa);

module.exports = router;
