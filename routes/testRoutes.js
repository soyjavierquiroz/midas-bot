const express = require('express');
const router = express.Router();
const { getImageBase64, getAudioBuffer } = require('../services/minioService');
const { getEtapaByNombre } = require('../services/dbService');

// GET /test-imagen
router.get('/test-imagen', async (req, res) => {
  try {
    const base64Image = await getImageBase64('bot-uploads', 'imagenes_etapa/2_dunn.jpg');
    res.json({ base64: base64Image });
  } catch (error) {
    console.error('Error en /test-imagen:', error);
    res.status(500).json({ error: 'Error al obtener imagen desde MinIO' });
  }
});

// GET /test-audio
router.get('/test-audio', async (req, res) => {
  const bucket = 'bot-uploads';
  const key = 'audios_pregrabados/2_dunn_4.mp3';

  try {
    console.log(`🎧 Solicitando audio: ${key}`);
    const audioBuffer = await getAudioBuffer(bucket, key);

    if (!audioBuffer || audioBuffer.length < 1000) {
      console.warn(`⚠️ Audio recibido es muy pequeño (${audioBuffer?.length} bytes).`);
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="2_dunn_4.mp3"');
    res.send(audioBuffer);
  } catch (error) {
    console.error(`❌ Error en /test-audio:`, error.message);
    res.status(404).json({ error: `Audio no encontrado: ${key}` });
  }
});

// GET /test-etapa
router.get('/test-etapa', async (req, res) => {
  const userId = 2;
  const etapa = 'dunn';

  try {
    const etapaData = await getEtapaByNombre(userId, etapa);
    if (!etapaData) {
      return res.status(404).json({ error: `Etapa '${etapa}' no encontrada para user ${userId}` });
    }
    res.json(etapaData);
  } catch (error) {
    console.error('❌ Error en /test-etapa:', error.message);
    res.status(500).json({ error: 'Error al consultar etapa' });
  }
});

module.exports = router;
