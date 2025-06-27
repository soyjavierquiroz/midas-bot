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
 * Interpola, codifica y (opcionalmente) acorta los campos de tipo enlace en el payload.
 * Modifica el payload in-place.
 */
async function acortarLinks(payload) {
  // --- 0) Modo “no acortar” cuando link_acortar === '0' ---
  if (payload.link_acortar === '0') {
    const camposSoloInterpolar = ['zoom', 'meet', 'link'];
    for (const campo of camposSoloInterpolar) {
      if (payload[campo]) {
        // Reemplazo de placeholders sin acortar
        payload[campo] = reemplazarVariables(payload[campo], payload);
      }
    }
    // Salimos sin tocar más
    return;
  }

  // --- 1) Comportamiento por defecto: acortar enlaces ---
  const campos = ['zoom', 'meet', 'link'];
  for (const campo of campos) {
    if (payload[campo]) {
      // 1.1) interpolar placeholders
      const originalUrl = reemplazarVariables(payload[campo], payload);
      // 1.2) codificar
      const encodedUrl  = encodeURI(originalUrl);
      // 1.3) generar alias semántico si existe link_slug
      const alias       = payload.link_slug
        ? generarAlias(payload.link_slug)
        : undefined;
      // 1.4) acortar con YOURLS via shortenURL()
      try {
        const short = await shortenURL(encodedUrl, alias);
        console.log(`🔗 Enlace acortado (${campo}): ${short}`);
        payload[campo] = short;
      } catch (error) {
        console.warn(
          `⚠️ No se pudo acortar el enlace ${campo}:`,
          error.message
        );
      }
    }
  }
}

module.exports = { acortarLinks };
