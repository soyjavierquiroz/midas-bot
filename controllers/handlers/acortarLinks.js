// controllers/handlers/acortarLinks.js

const { reemplazarVariables } = require('../../utils/textUtils');
const { shortenURL }          = require('../../utils/urlShortener');

/**
 * Genera un alias aleatorio a partir de un slug base.
 * @param {string} slug 
 * @returns {string}
 */
function generarAlias(slug) {
  const random = Math.random().toString(36).substring(2, 5);
  return `${slug}-${random}`;
}

/**
 * Interpola, codifica y (opcionalmente) acorta los campos de tipo enlace en el payload.
 * Modifica el payload in-place.
 * 
 * @param {object} payload 
 */
async function acortarLinks(payload) {
  // 0) Modo “no acortar”
  if (payload.link_acortar === '0') {
    const campos = ['zoom', 'meet', 'link'];
    for (const campo of campos) {
      if (payload[campo]) {
        payload[campo] = reemplazarVariables(payload[campo], payload);
      }
    }
    return;
  }

  // 1) Modo “acortar”
  const campos = ['zoom', 'meet', 'link'];
  for (const campo of campos) {
    if (!payload[campo]) continue;

    // 1.1) Interpolamos los placeholders
    const interpolado = reemplazarVariables(payload[campo], payload);
    // 1.2) Codificamos la URL resultante
    const encodedUrl = encodeURI(interpolado);
    // 1.3) La dejamos en el payload, aunque no acabe acortada
    payload[campo] = encodedUrl;

    // 1.4) Generar alias semántico si hay link_slug
    const alias = payload.link_slug ? generarAlias(payload.link_slug) : undefined;

    // 1.5) Intento de acortado
    try {
      const short = await shortenURL(encodedUrl, alias);
      console.log(`🔗 Enlace acortado (${campo}):`, short);
      payload[campo] = short;
    } catch (err) {
      console.warn(`⚠️ No se pudo acortar el enlace ${campo}:`, err.message);
      // payload[campo] ya contiene la versión codificada del URL original
    }
  }
}

module.exports = { acortarLinks };
