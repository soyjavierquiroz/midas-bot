// utils/urlShortener.js

const axios = require('axios');

const YOURLS_API       = process.env.YOURLS_API;
const YOURLS_SIGNATURE = process.env.YOURLS_SIGNATURE;

// Detectamos el host del YOURLS API (p.ej. "kuruk.in")
let YOURLS_HOST = null;
try {
  if (YOURLS_API) {
    YOURLS_HOST = new URL(YOURLS_API).host; // ej: kuruk.in
  }
} catch {
  // si no se puede parsear, dejamos el check desactivado
  YOURLS_HOST = null;
}

/**
 * Determina si la URL ya es corta (del mismo host que YOURLS).
 */
function isAlreadyShort(url) {
  if (!YOURLS_HOST) return false;
  try {
    const host = new URL(url).host;
    return host === YOURLS_HOST || host === `www.${YOURLS_HOST}`;
  } catch {
    return false;
  }
}

/**
 * Acorta una URL usando YOURLS.
 * - Evita "acortar un short link" (early return).
 * - Si la URL ya existe, captura el error y devuelve el shorturl existente.
 * - Si falla por otro motivo, hace fallback a GET.
 *
 * @param {string} url  - URL completamente formada (sin placeholders).
 * @param {string} slug - alias semántico; si es falsy, YOURLS genera uno aleatorio.
 */
async function shortenURL(url, slug) {
  // 🔒 Protección: si ya es corta (mismo dominio YOURLS), no reintentar
  if (isAlreadyShort(url)) {
    console.log('↩️ shortenURL: URL ya corta, no se acorta de nuevo:', url);
    return url;
  }

  const params = new URLSearchParams();
  params.append('signature', YOURLS_SIGNATURE);
  params.append('action',    'shorturl');
  params.append('format',    'json');
  params.append('url',       url);
  if (slug) params.append('keyword', slug);

  const logErr = (marker, data) => console.error(`❌ ${marker}`, data);

  // 1) Intento con POST
  try {
    console.log('🔗 shortenURL POST →', { url, slug, api: YOURLS_API });
    const resp = await axios.post(YOURLS_API, params);
    const data = resp.data;

    if (data.status === 'success' && data.shorturl) return data.shorturl;

    // Duplicado: algunos YOURLS devuelven fail + shorturl cuando ya existe
    if (data.status === 'fail' && data.shorturl) {
      console.log('ℹ️ URL ya existente en YOURLS, uso shorturl existente:', data.shorturl);
      return data.shorturl;
    }

    throw new Error(`YOURLS error: status=${data.status} code=${data.code}`);
  } catch (error) {
    const d = error.response?.data;

    // Duplicado atrapado en catch
    if (d && d.shorturl) {
      console.log('ℹ️ Duplicate URL, recupero shorturl existente:', d.shorturl);
      return d.shorturl;
    }

    // Si el server avisa que es un short link (no loop), retornamos original
    if (d?.code === 'error:noloop') {
      console.log('↩️ YOURLS noloop: URL ya es short, regreso original:', url);
      return url;
    }

    logErr('Error al acortar con POST', d || error.message);

    // 2) Fallback GET
    try {
      const query =
        `?signature=${YOURLS_SIGNATURE}` +
        `&action=shorturl&format=json&url=${encodeURIComponent(url)}` +
        (slug ? `&keyword=${slug}` : '');

      const endpoint = YOURLS_API + query;
      console.log('🔗 shortenURL FALLBACK GET →', endpoint);

      const resp2 = await axios.get(endpoint);
      const d2 = resp2.data;

      if (d2.status === 'success' && d2.shorturl) return d2.shorturl;

      if (d2.status === 'fail' && d2.shorturl) {
        console.log('ℹ️ Duplicate URL (GET), uso shorturl existente:', d2.shorturl);
        return d2.shorturl;
      }

      if (d2?.code === 'error:noloop') {
        console.log('↩️ YOURLS noloop (GET): URL ya es short, regreso original:', url);
        return url;
      }

      throw new Error(`YOURLS GET error: status=${d2.status} code=${d2.code}`);
    } catch (error2) {
      logErr('Error al acortar con GET', error2.response?.data || error2.message);
      throw error2;
    }
  }
}

module.exports = { shortenURL };
