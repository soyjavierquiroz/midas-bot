// controllers/handlers/handleEtapa.js

const etapaService                    = require('../../services/etapaService');
const minioService                    = require('../../services/minioService');
const ttsService                      = require('../../services/ttsService');
const fusionService                   = require('../../services/fusionService');
const { reemplazarVariables }         = require('../../utils/textUtils');
const { findLeadByPhoneAndInstance }  = require('../../services/leadService');

/**
 * Flujo de etapa con tolerancia a fallos de TTS/fusión:
 * - Si TTS falla (p.ej. créditos bajos), usa SOLO audio pregrabado (sin fusionar).
 * - Si fusión falla, usa SOLO audio pregrabado.
 * - Si no hay pregrabado pero TTS salió, usa SOLO TTS.
 */
async function handleEtapa(payload) {
  if (!payload.user_id || !payload.etapa) {
    console.error('🚫 handleEtapa: faltan campos user_id o etapa', payload);
    throw { status: 400, message: 'Faltan campos obligatorios: user_id, etapa' };
  }
  console.log(`🔄 handleEtapa: iniciando (user_id=${payload.user_id}, etapa=${payload.etapa})`);

  // Rellenar nombre/apellido desde DB si no llegan
  if (!payload.nombre || !payload.nombre.trim()) {
    try {
      const lead = await findLeadByPhoneAndInstance(
        payload.telefono,
        payload.instancia_evolution_api
      );
      if (lead && lead.nombre) {
        payload.nombre   = lead.nombre;
        payload.apellido = lead.apellido;
        console.log('🔄 handleEtapa: nombre/apellido recuperados de DB →', payload.nombre, payload.apellido);
      } else {
        console.warn('⚠️ handleEtapa: nombre/apellido no enviados y lead no existe o nombre NULL');
      }
    } catch (err) {
      console.warn('⚠️ handleEtapa: error al recuperar lead de DB', err);
    }
  }

  // 1) Cargar etapa
  const etapa = await etapaService.obtenerEtapa(payload.user_id, payload.etapa);
  if (!etapa) {
    console.error(`🚫 handleEtapa: etapa no encontrada (user_id=${payload.user_id}, etapa=${payload.etapa})`);
    throw { status: 404, message: 'Etapa no encontrada' };
  }
  console.log(`✅ Etapa encontrada: user_id=${etapa.user_id}, nombre=${etapa.nombre}`);

  // 2) Parseo de textos
  let textos = [], textosHtml = [];
  try { textos     = JSON.parse(etapa.textos      || '[]').filter(Boolean); }
  catch (e) { console.warn('⚠️ handleEtapa: error parseando etapa.textos', e); }
  try { textosHtml = JSON.parse(etapa.textos_html || '[]').filter(Boolean); }
  catch (e) { console.warn('⚠️ handleEtapa: error parseando etapa.textos_html', e); }

  const idx1 = Math.floor(Math.random() * textos.length);
  const textoPlanoOriginal = textos[idx1] || '';

  const idx2 = Math.floor(Math.random() * textosHtml.length);
  let textoHtmlOriginal;
  if (typeof payload.texto_html === 'string' && payload.texto_html.trim() !== '') {
    textoHtmlOriginal = payload.texto_html;
    console.log('🔄 handleEtapa: usando texto_html del payload en lugar de la base de datos');
  } else {
    textoHtmlOriginal = textosHtml[idx2] || '';
  }

  // 3) Reemplazo de variables
  const textoPlano = reemplazarVariables(textoPlanoOriginal, payload);
  const textoHtml  = reemplazarVariables(textoHtmlOriginal,  payload);

  // 4) Audio con tolerancia a fallos
  const configTTS = await etapaService.obtenerConfigTTS(payload.user_id);

  let audioBase = null;
  let audioTTS  = null;
  let audioFinal = null;

  // Siempre intentamos descargar el pregrabado: lo necesitamos como fallback
  try {
    audioBase = await minioService.obtenerAudioAleatorio(payload.user_id, payload.etapa);
    console.log(`🔊 Audio pregrabado descargado (${audioBase.length} bytes)`);
  } catch (e) {
    console.warn('⚠️ No se pudo descargar audio pregrabado de MinIO:', e?.message || e);
  }

  if (textoPlano) {
    try {
      // Puede lanzar error (credenciales, créditos, 402/429, etc.)
      audioTTS = await ttsService.generarAudioTTS(textoPlano, configTTS);
      console.log(`🔊 Audio TTS generado (${audioTTS.length} bytes)`);

      // Si hay pregrabado, intentamos fusionar; si falla, mandamos solo pregrabado
      if (audioBase) {
        try {
          audioFinal = await fusionService.fusionarAudios(audioTTS, audioBase);
          console.log(`🔊 Audio fusionado (${audioFinal.length} bytes)`);
        } catch (e) {
          console.warn('⚠️ Fusión falló; se usará SOLO el pregrabado:', e?.message || e);
          audioFinal = audioBase;
        }
      } else {
        // No hay pregrabado: al menos devolvemos el TTS puro
        audioFinal = audioTTS;
      }
    } catch (err) {
      // IMPORTANTE: no interrumpimos el flujo; usamos SOLO pregrabado
      const status  = err?.message || '';
      console.warn('⚠️ TTS falló; se usará SOLO el pregrabado. Detalle:', status);
      audioFinal = audioBase || null; // si tampoco hay pregrabado, enviamos null
    }
  } else {
    console.log('ℹ️ Texto plano vacío: se enviará SOLO el pregrabado (si existe).');
    audioFinal = audioBase || null;
  }

  // 5) Imagen
  const imagenKey    = `imagenes_etapa/${payload.user_id}_${payload.etapa}.jpg`;
  const imagenBase64 = await minioService.getImageBase64('bot-uploads', imagenKey);
  console.log(`🖼 Imagen obtenida (${imagenBase64.length} chars)`);

  console.log('✅ handleEtapa: flujo completado');
  return { textoHtml, audioFusionado: audioFinal, imagenBase64 };
}

module.exports = { handleEtapa };
