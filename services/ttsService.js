// services/ttsService.js

const axios = require('axios');
const { tts: envTts } = require('../config');

/**
 * Genera audio TTS usando ElevenLabs.
 * 
 * @param {string} texto - Texto a convertir en audio.
 * @param {Object} [override] - Configuración opcional proveniente de payload/DB.
 * @returns {Promise<Buffer>} - Buffer con el audio generado.
 * @throws {Error} - Si la llamada a ElevenLabs falla.
 */
async function generarAudioTTS(texto, override = {}) {
  const {
    model_id: oModelId,
    voice_id: oVoiceId,
    eleven_api_key: oApiKey,
    stability: oStability,
    similarity_boost: oSimilarityBoost,
    style: oStyle,
    speaker_boost: oSpeakerBoost,
  } = override;

  // Fallback: si no viene en override, usamos la config de env
  const apiKey               = oApiKey             || envTts.apiKey;
  const voiceId              = oVoiceId            || envTts.voiceId;
  const modelId              = oModelId            || envTts.modelId;
  const stabilityUsed        = oStability ?? envTts.stability;
  const similarityBoostUsed  = oSimilarityBoost ?? envTts.similarityBoost;
  const styleUsed            = oStyle      ?? envTts.style;
  const speakerBoostUsed     = oSpeakerBoost ?? envTts.speakerBoost;

  const payload = {
    text: texto,
    model_id: modelId,
    voice_settings: {
      stability: stabilityUsed,
      similarity_boost: similarityBoostUsed,
      style: styleUsed,
      use_speaker_boost: speakerBoostUsed,
    },
  };

  console.log('🔤 Texto para TTS:', texto);
  console.log('🎛 Modelo:', modelId);
  console.log('🔊 Voz:', voiceId);
  console.log('🧪 Parámetros:', payload.voice_settings);

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        responseType: 'arraybuffer',
      }
    );
    console.log('✅ Audio TTS generado correctamente');
    return Buffer.from(response.data);
  } catch (err) {
    const status = err.response?.status;
    const rawData = err.response?.data?.toString('utf8');
    console.error('❌ ElevenLabs TTS failed with status:', status);
    console.error('❌ Response data:', rawData);
    throw new Error(`TTS error: ${status}`);
  }
}

module.exports = { generarAudioTTS };
