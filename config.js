// config.js
require('dotenv').config();

const toBool  = (v, def = false) => v === undefined ? def : ['true','1','yes','on'].includes(String(v).toLowerCase());
const toFloat = (v, def) => Number.isFinite(parseFloat(v)) ? parseFloat(v) : def;

module.exports = {
  port: parseInt(process.env.PORT, 10) || 4001,

  // MinIO
  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    region: process.env.MINIO_REGION || 'us-east-1',
    forcePathStyle: toBool(process.env.MINIO_FORCE_PATH_STYLE, true),
  },

  // MySQL
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },

  // YOURLS
  yourls: {
    apiUrl: process.env.YOURLS_API,
    signature: process.env.YOURLS_SIGNATURE,
  },

  // TTS
  tts: {
    apiKey: process.env.ELEVEN_API_KEY,
    voiceId: process.env.ELEVEN_VOICE_ID,
    modelId: process.env.ELEVEN_MODEL_ID,
    stability: toFloat(process.env.TTS_STABILITY, 0.5),
    similarityBoost: toFloat(process.env.TTS_SIMILARITY_BOOST, 0.7),
    style: toFloat(process.env.TTS_STYLE, 0.8),
    speakerBoost: toBool(process.env.TTS_USE_SPEAKER_BOOST, true),
    voiceSpeed: toFloat(process.env.VOICE_SPEED, 1.0), // ← NUEVO
  },
};
