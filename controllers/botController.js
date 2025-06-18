const etapaService = require('../services/etapaService');
const minioService = require('../services/minioService');
const ttsService = require('../services/ttsService');
const fusionService = require('../services/fusionService');
const { reemplazarVariables, generarVariablesFecha } = require('../utils/textUtils');
const { shortenURL } = require('../utils/urlShortener');

function generarAlias(slug) {
  const random = Math.random().toString(36).substring(2, 5);
  return `${slug}-${random}`;
}

async function acortarLinks(payload) {
  const campos = ['zoom', 'meet', 'link'];
  for (const campo of campos) {
    if (payload[campo]) {
      const alias = payload.link_slug ? generarAlias(payload.link_slug) : undefined;
      try {
        const short = await shortenURL(payload[campo], alias);
        console.log(`🔗 Enlace acortado (${campo}): ${short}`);
        payload[campo] = short;
      } catch (error) {
        console.warn(`⚠️ No se pudo acortar el enlace ${campo}:`, error.message);
      }
    }
  }
}

exports.procesarEtapa = async (req, res) => {
  try {
    const payload = { ...req.body };
    console.log('📥 Payload recibido:', payload);

    // Si viene mensaje directo, lo procesamos sin lógica de etapa
    if (payload.mensaje) {
      if (payload.fecha && payload.zona_horaria) {
        const enriquecido = generarVariablesFecha(payload);
        Object.assign(payload, enriquecido);
        console.log('🕒 Variables enriquecidas:', enriquecido);
      }

      await acortarLinks(payload);
      const textoProcesado = reemplazarVariables(payload.mensaje, payload);

      return res.json({
        success: true,
        data: {
          texto_html: textoProcesado,
          payload_original: payload
        }
      });
    }

    if (!payload.user_id || !payload.etapa) {
      return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });
    }

    if (payload.fecha && payload.zona_horaria) {
      const enriquecido = generarVariablesFecha(payload);
      Object.assign(payload, enriquecido);
      console.log('🕒 Variables enriquecidas:', enriquecido);
    }

    await acortarLinks(payload);

    const etapa = await etapaService.obtenerEtapa(payload.user_id, payload.etapa);
    if (!etapa) {
      console.warn('⚠️ Etapa no encontrada para', payload.user_id, payload.etapa);
      return res.status(404).json({ success: false, error: 'Etapa no encontrada' });
    }

    const textos = JSON.parse(etapa.textos || '[]').filter(Boolean);
    const textosHtml = JSON.parse(etapa.textos_html || '[]').filter(Boolean);

    const textoPlanoOriginal = textos[Math.floor(Math.random() * textos.length)] || '';
    const textoHtmlOriginal = textosHtml[Math.floor(Math.random() * textosHtml.length)] || '';

    const textoPlano = reemplazarVariables(textoPlanoOriginal, payload);
    const textoHtml = reemplazarVariables(textoHtmlOriginal, payload);

    const configTTS = await etapaService.obtenerConfigTTS(payload.user_id);
    const audioTTS = textoPlano ? await ttsService.generarAudioTTS(textoPlano, configTTS) : null;
    const audioEtapa = await minioService.obtenerAudioAleatorio(payload.user_id, payload.etapa);
    const audioFusionado = audioTTS ? await fusionService.fusionarAudios(audioTTS, audioEtapa) : null;

    const imagenKey = `imagenes_etapa/${payload.user_id}_${payload.etapa}.jpg`;
    const imagenBase64 = await minioService.getImageBase64('bot-uploads', imagenKey);

    res.json({
      success: true,
      data: {
        imagen_base64_puro: imagenBase64,
        texto_html: textoHtml,
        audio_base64_puro: audioFusionado?.toString('base64') || null,
        payload_original: payload
      }
    });

  } catch (error) {
    console.error('❌ Error al procesar etapa:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
