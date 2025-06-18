const etapaService = require('../services/etapaService');
const minioService = require('../services/minioService');
const ttsService = require('../services/ttsService');
const fusionService = require('../services/fusionService');
const { reemplazarVariables, generarVariablesFecha } = require('../utils/textUtils');

exports.procesarEtapa = async (req, res) => {
  try {
    const payload = { ...req.body };
    console.log('📥 Payload recibido:', payload);

    if (!payload.user_id || !payload.etapa) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
    }

    // ⏰ Enriquecer payload con fecha legible si aplica
    if (payload.fecha && payload.zona_horaria) {
      const enriquecido = generarVariablesFecha(payload);
      Object.assign(payload, enriquecido);
      console.log('🕒 Variables enriquecidas:', enriquecido);
    }

    const etapa = await etapaService.obtenerEtapa(payload.user_id, payload.etapa);
    if (!etapa) {
      console.warn('⚠️ Etapa no encontrada para', payload.user_id, payload.etapa);
      return res.status(404).json({ success: false, error: 'Etapa no encontrada' });
    }

    const textos = (JSON.parse(etapa.textos || '[]')).filter(t => t && t.trim());
    const textoOriginalPlano = textos[Math.floor(Math.random() * textos.length)] || '';
    console.log('🧾 Texto plano original:', textoOriginalPlano);

    const textosHtml = (JSON.parse(etapa.textos_html || '[]')).filter(t => t && t.trim());
    const textoOriginalHtml = textosHtml[Math.floor(Math.random() * textosHtml.length)] || '';
    console.log('📚 Etapa.textos_html filtrados:', textosHtml);
    console.log('📄 Texto HTML original:', textoOriginalHtml);

    const textoPlano = reemplazarVariables(textoOriginalPlano, payload);
    const textoHtml = reemplazarVariables(textoOriginalHtml, payload);
    console.log('📝 Texto HTML generado:', textoHtml);
    console.log('🔤 Texto para TTS:', textoPlano);

    if (!textoPlano.trim()) {
      return res.status(400).json({ success: false, error: 'No hay texto válido para generar TTS' });
    }

    const configTTS = await etapaService.obtenerConfigTTS(payload.user_id);
    const audioTTS = await ttsService.generarAudioTTS(textoPlano, configTTS);
    const audioEtapa = await minioService.obtenerAudioAleatorio(payload.user_id, payload.etapa);
    const audioFusionado = await fusionService.fusionarAudios(audioTTS, audioEtapa);

    const imagenKey = `imagenes_etapa/${payload.user_id}_${payload.etapa}.jpg`;
    const imagenBase64 = await minioService.getImageBase64('bot-uploads', imagenKey);

    res.json({
      success: true,
      data: {
        imagen_base64_puro: imagenBase64,
        texto_html: textoHtml,
        audio_base64_puro: audioFusionado.toString('base64'),
        payload_original: payload
      }
    });

  } catch (error) {
    console.error('❌ Error al procesar etapa:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
