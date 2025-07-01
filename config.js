// config.js
require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 4000,

  // Configuración de MinIO
  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    region: process.env.MINIO_REGION,
    forcePathStyle: process.env.MINIO_FORCE_PATH_STYLE === 'true',
  },

  // Configuración de la base de datos MySQL
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },

  // Configuración de YOURLS
  yourls: {
    apiUrl: process.env.YOURLS_API,
    signature: process.env.YOURLS_SIGNATURE,
  },

  // Configuración de ElevenLabs TTS
  tts: {
    apiKey: process.env.ELEVEN_API_KEY,
    voiceId: process.env.ELEVEN_VOICE_ID,
    modelId: process.env.ELEVEN_MODEL_ID,
    stability: parseFloat(process.env.TTS_STABILITY) || 0.5,
    similarityBoost: parseFloat(process.env.TTS_SIMILARITY_BOOST) || 0.7,
    style: parseFloat(process.env.TTS_STYLE) || 0.8,
    speakerBoost: process.env.TTS_USE_SPEAKER_BOOST === 'true',
  },
};
