// controllers/handlers/acortarLinks.js

const { reemplazarVariables } = require('../../utils/textUtils');
const { shortenURL }          = require('../../utils/urlShortener');

/**
 * Genera un alias aleatorio a partir de un slug base.
 */
function generarAlias(slug) {
  const random = Math.random().toString(36).substring(2, 5);
  return `${slug}-${random}`;
}

/**
 * Interpola, codifica y acorta los campos de tipo enlace en el payload.
 * Modifica el payload en sitio.
 * 
 * @param {object} payload
 */
async function acortarLinks(payload) {
  const campos = ['zoom', 'meet', 'link'];
  for (const campo of campos) {
    if (payload[campo]) {
      // 1) interpolar placeholders
      const originalUrl = reemplazarVariables(payload[campo], payload);
      // 2) codificar
      const encodedUrl  = encodeURI(originalUrl);
      // 3) alias semántico
      const alias       = payload.link_slug ? generarAlias(payload.link_slug) : undefined;
      try {
        const short = await shortenURL(encodedUrl, alias);
        console.log(`🔗 Enlace acortado (${campo}): ${short}`);
        payload[campo] = short;
      } catch (error) {
        console.warn(`⚠️ No se pudo acortar el enlace ${campo}:`, error.message);
      }
    }
  }
}

module.exports = { acortarLinks };
