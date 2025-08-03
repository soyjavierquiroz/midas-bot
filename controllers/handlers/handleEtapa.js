const etapaService                    = require('../../services/etapaService');
const minioService                   = require('../../services/minioService');
const ttsService                     = require('../../services/ttsService');
const fusionService                  = require('../../services/fusionService');
const { reemplazarVariables }        = require('../../utils/textUtils');
const { acortarLinks }               = require('./acortarLinks');
const { findLeadByPhoneAndInstance } = require('../../services/leadService'); // NEW

/**
 * Orquesta el flujo completo de “etapa”:
 * 1) Valida payload  
 * 2) Acorta e interpola enlaces  
 * 3) Recupera datos de etapa  
 * 4) Selecciona texto (plano + HTML), reemplaza variables  
 * 5) Genera audio TTS + fusiona con audio base  
 * 6) Descarga imagen y la codifica en Base64  
 *
 * @param {object}  payload
 * @param {string}  payload.user_id
 * @param {string}  payload.etapa
 * @returns {Promise<{
 *   textoHtml: string,
 *   audioFusionado: Buffer | null,
 *   imagenBase64: string
 * }>}
 * @throws {{ status: number, message: string }}
 */
async function handleEtapa(payload) {
  // 1) Validación inicial
  if (!payload.user_id || !payload.etapa) {
    console.error('🚫 handleEtapa: faltan campos user_id o etapa', payload);
    throw { status: 400, message: 'Faltan campos obligatorios: user_id, etapa' };
  }
  console.log(`🔄 handleEtapa: iniciando (user_id=${payload.user_id}, etapa=${payload.etapa})`);

  // --- NEW: Si no viene nombre/apellido en el payload, intentar recuperarlos de la DB ---
  if (!payload.nombre || !payload.nombre.trim()) {
    try {
      const lead = await findLeadByPhoneAndInstance(
        payload.telefono,
        payload.instancia_evolution_api
      );
      if (lead && lead.nombre) {
        payload.nombre   = lead.nombre;
        payload.apellido = lead.apellido;
        console.log(
          '🔄 handleEtapa: nombre/apellido recuperados de DB →',
          payload.nombre, payload.apellido
        );
      } else {
        console.warn('⚠️ handleEtapa: nombre/apellido no enviados y lead no existe o nombre NULL');
      }
    } catch (err) {
      console.warn('⚠️ handleEtapa: error al recuperar lead de DB', err);
    }
  }
  // --- END NEW ---

  // 2) Acortar e interpolar enlaces
  await acortarLinks(payload);

  // 3) Obtener datos de la etapa
  const etapa = await etapaService.obtenerEtapa(payload.user_id, payload.etapa);
  if (!etapa) {
    console.error(
      `🚫 handleEtapa: etapa no encontrada (user_id=${payload.user_id}, etapa=${payload.etapa})`
    );
    throw { status: 404, message: 'Etapa no encontrada' };
  }
  console.log(`✅ Etapa encontrada: user_id=${etapa.user_id}, nombre=${etapa.nombre}`);

  // 4) Parsear y limpiar arrays de textos
  let textos = [], textosHtml = [];
  try { textos     = JSON.parse(etapa.textos     || '[]').filter(Boolean); }
  catch (e) { console.warn('⚠️ handleEtapa: error parseando etapa.textos', e); }
  try { textosHtml = JSON.parse(etapa.textos_html|| '[]').filter(Boolean); }
  catch (e) { console.warn('⚠️ handleEtapa: error parseando etapa.textos_html', e); }

  // Selección aleatoria de texto plano
  const idx1               = Math.floor(Math.random() * textos.length);
  const textoPlanoOriginal = textos[idx1] || '';
  console.log(`📄 Texto plano [${idx1}]:`, textoPlanoOriginal);

  // 5) Selección de HTML: override si viene texto_html en payload
  const idx2 = Math.floor(Math.random() * textosHtml.length);
  let textoHtmlOriginal;
  if (typeof payload.texto_html === 'string' && payload.texto_html.trim() !== '') {
    textoHtmlOriginal = payload.texto_html;                                   // MODIFIED
    console.log('🔄 handleEtapa: usando texto_html del payload en lugar de la base de datos');
  } else {
    textoHtmlOriginal = textosHtml[idx2] || '';
    console.log(`📄 Texto HTML [${idx2}]:`, textoHtmlOriginal);
  }
  // --- END MODIFIED ---

  // 6) Reemplazar variables en texto plano y HTML
  const textoPlano = reemplazarVariables(textoPlanoOriginal, payload);
  const textoHtml  = reemplazarVariables(textoHtmlOriginal,  payload);

  // 7) Generar audio TTS + fusión con audio base
  const configTTS     = await etapaService.obtenerConfigTTS(payload.user_id);
  let audioFusionado  = null;
  if (textoPlano) {
    const audioTTS = await ttsService.generarAudioTTS(textoPlano, configTTS);
    console.log(`🔊 Audio TTS generado (${audioTTS.length} bytes)`);

    const audioBase = await minioService.obtenerAudioAleatorio(
      payload.user_id,
      payload.etapa
    );
    console.log(`🔊 Audio base descargado (${audioBase.length} bytes)`);

    audioFusionado = await fusionService.fusionarAudios(audioTTS, audioBase);
    console.log(`🔊 Audio fusionado (${audioFusionado.length} bytes)`);
  } else {
    console.log('ℹ️ handleEtapa: textoPlano vacío, salto generación de TTS');
  }

  // 8) Descargar imagen y codificar en Base64
  const imagenKey    = `imagenes_etapa/${payload.user_id}_${payload.etapa}.jpg`;
  const imagenBase64 = await minioService.getImageBase64('bot-uploads', imagenKey);
  console.log(`🖼 Imagen obtenida (${imagenBase64.length} chars)`);

  console.log('✅ handleEtapa: flujo completado correctamente');
  return { textoHtml, audioFusionado, imagenBase64 };
}

module.exports = { handleEtapa };
