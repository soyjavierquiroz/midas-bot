// controllers/handlers/handleEtapa.js

const etapaService           = require('../../services/etapaService');
const minioService           = require('../../services/minioService');
const ttsService             = require('../../services/ttsService');
const fusionService          = require('../../services/fusionService');
const { reemplazarVariables }= require('../../utils/textUtils');
const { acortarLinks }       = require('./acortarLinks');

/**
 * Maneja todo el flujo de ‘etapa’:
 * - Valida campos
 * - Acorta enlaces
 * - Carga datos de etapa y selecciona texto
 * - Genera TTS y fusiona audio
 * - Descarga imagen
 *
 * @param {object} payload
 * @returns {Promise<{textoHtml: string, audioFusionado: Buffer|null, imagenBase64: string}>}
 * @throws {object} { status, message }
 */
async function handleEtapa(payload) {
  if (!payload.user_id || !payload.etapa) {
    throw { status: 400, message: 'Faltan campos obligatorios' };
  }

  // 1) Acortar e interpolar enlaces
  await acortarLinks(payload);

  // 2) Cargar la etapa desde MySQL/WordPress
  const etapa = await etapaService.obtenerEtapa(payload.user_id, payload.etapa);
  if (!etapa) {
    throw { status: 404, message: 'Etapa no encontrada' };
  }

  // 3) Parsear textos
  const textos     = JSON.parse(etapa.textos     || '[]').filter(Boolean);
  const textosHtml = JSON.parse(etapa.textos_html|| '[]').filter(Boolean);

  // 4) Selección aleatoria de texto plano y HTML
  const textoPlanoOriginal = textos[Math.floor(Math.random() * textos.length)] || '';
  const textoHtmlOriginal  = textosHtml[Math.floor(Math.random() * textosHtml.length)] || '';

  // 5) Reemplazo de variables
  const textoPlano = reemplazarVariables(textoPlanoOriginal, payload);
  const textoHtml  = reemplazarVariables(textoHtmlOriginal, payload);

  // 6) Generación de audio TTS
  const configTTS = await etapaService.obtenerConfigTTS(payload.user_id);
  const audioTTS  = textoPlano
    ? await ttsService.generarAudioTTS(textoPlano, configTTS)
    : null;

  // 7) Obtención de audio base y fusión
  const audioEtapa    = await minioService.obtenerAudioAleatorio(payload.user_id, payload.etapa);
  const audioFusionado= audioTTS
    ? await fusionService.fusionarAudios(audioTTS, audioEtapa)
    : null;

  // 8) Descarga de imagen en Base64
  const imagenKey   = `imagenes_etapa/${payload.user_id}_${payload.etapa}.jpg`;
  const imagenBase64= await minioService.getImageBase64('bot-uploads', imagenKey);

  return { textoHtml, audioFusionado, imagenBase64 };
}

module.exports = { handleEtapa };
