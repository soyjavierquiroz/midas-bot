const axios = require('axios');

exports.generarAudioTTS = async (texto, config) => {
  const payload = {
    text: texto,
    model_id: config.model_id,
    voice_settings: {
      stability: config.stability,
      similarity_boost: config.similarity_boost,
      style: config.style,
      use_speaker_boost: !!config.speaker_boost
    }
  };

  try {
    console.log('🔤 Texto para TTS:', texto);
    console.log('🎛 Modelo:', config.model_id);
    console.log('🔊 Voz:', config.voice_id);
    console.log('🧪 Parámetros:', payload.voice_settings);

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.voice_id}/stream`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': config.eleven_api_key
        },
        responseType: 'arraybuffer'
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
};
