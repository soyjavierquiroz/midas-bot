// controllers/handlers/handleEtapa.js

const etapaService                    = require('../../services/etapaService');
const minioService                   = require('../../services/minioService');
const ttsService                     = require('../../services/ttsService');
const fusionService                  = require('../../services/fusionService');
const { reemplazarVariables }        = require('../../utils/textUtils');
const { findLeadByPhoneAndInstance } = require('../../services/leadService');

async function handleEtapa(payload) {
  if (!payload.user_id || !payload.etapa) {
    console.error('🚫 handleEtapa: faltan campos user_id o etapa', payload);
    throw { status: 400, message: 'Faltan campos obligatorios: user_id, etapa' };
  }
  console.log(`🔄 handleEtapa: iniciando (user_id=${payload.user_id}, etapa=${payload.etapa})`);

  // Si no viene nombre/apellido, intentar recuperarlos de DB
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

  // 1) Obtener datos de la etapa
  const etapa = await etapaService.obtenerEtapa(payload.user_id, payload.etapa);
  if (!etapa) {
    console.error(`🚫 handleEtapa: etapa no encontrada (user_id=${payload.user_id}, etapa=${payload.etapa})`);
    throw { status: 404, message: 'Etapa no encontrada' };
  }
  console.log(`✅ Etapa encontrada: user_id=${etapa.user_id}, nombre=${etapa.nombre}`);

  // 2) Parsear textos
  let textos = [], textosHtml = [];
  try { textos     = JSON.parse(etapa.textos     || '[]').filter(Boolean); }
  catch (e) { console.warn('⚠️ handleEtapa: error parseando etapa.textos', e); }
  try { textosHtml = JSON.parse(etapa.textos_html|| '[]').filter(Boolean); }
  catch (e) { console.warn('⚠️ handleEtapa: error parseando etapa.textos_html', e); }

  const idx1               = Math.floor(Math.random() * textos.length);
  const textoPlanoOriginal = textos[idx1] || '';
  const idx2               = Math.floor(Math.random() * textosHtml.length);

  let textoHtmlOriginal;
  if (typeof payload.texto_html === 'string' && payload.texto_html.trim() !== '') {
    textoHtmlOriginal = payload.texto_html;
    console.log('🔄 handleEtapa: usando texto_html del payload en lugar de la base de datos');
  } else {
    textoHtmlOriginal = textosHtml[idx2] || '';
  }

  // 3) Reemplazar variables
  const textoPlano = reemplazarVariables(textoPlanoOriginal, payload);
  const textoHtml  = reemplazarVariables(textoHtmlOriginal,  payload);

  // 4) TTS + (opcional) fusión con audio base
  const configTTS     = await etapaService.obtenerConfigTTS(payload.user_id);
  let audioFusionado  = null;

  if (textoPlano) {
    const audioTTS = await ttsService.generarAudioTTS(textoPlano, configTTS);

    try {
      const audioBase = await minioService.obtenerAudioAleatorio(payload.user_id, payload.etapa);
      audioFusionado = await fusionService.fusionarAudios(audioTTS, audioBase);
    } catch (err) {
      console.warn('⚠️ TTS sin fusión (no hay audio base o falló ffmpeg):', err?.message || err);
      audioFusionado = audioTTS; // fallback: TTS puro
    }
  } else {
    console.log('ℹ️ handleEtapa: textoPlano vacío, salto generación de TTS');
  }

  // 5) Imagen
  const imagenKey    = `imagenes_etapa/${payload.user_id}_${payload.etapa}.jpg`;
  const imagenBase64 = await minioService.getImageBase64('bot-uploads', imagenKey);

  console.log('✅ handleEtapa: flujo completado');
  return { textoHtml, audioFusionado, imagenBase64 };
}

module.exports = { handleEtapa };
