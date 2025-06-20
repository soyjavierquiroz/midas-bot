// utils/urlShortener.js

const axios = require('axios');

const YOURLS_API       = process.env.YOURLS_API;
const YOURLS_SIGNATURE = process.env.YOURLS_SIGNATURE;

/**
 * Acorta una URL usando YOURLS.
 * - Si la URL ya existe, captura el error y devuelve el shorturl existente.
 * - Si falla por otro motivo, hace fallback a GET.
 *
 * @param {string} url  - URL completamente formada (sin placeholders).
 * @param {string} slug - alias semántico; si es falsy, YOURLS genera uno aleatorio.
 */
async function shortenURL(url, slug) {
  const params = new URLSearchParams();
  params.append('signature', YOURLS_SIGNATURE);
  params.append('action',    'shorturl');
  params.append('format',    'json');
  params.append('url',       url);
  if (slug) params.append('keyword', slug);

  // Helper para loguear errores
  function log(marker, data) {
    console.error(`❌ ${marker}`, data);
  }

  // 1) Intento con POST
  try {
    console.log('🔗 shortenURL POST →', { url, slug, api: YOURLS_API });
    const resp = await axios.post(YOURLS_API, params);
    const data = resp.data;

    if (data.status === 'success' && data.shorturl) {
      return data.shorturl;
    }
    // Si YOURLS responde 'fail' pero incluye shorturl por URL duplicada:
    if (data.status === 'fail' && data.code === 'error:url' && data.shorturl) {
      console.log('ℹ️ URL ya existente en YOURLS, uso shorturl existente:', data.shorturl);
      return data.shorturl;
    }

    throw new Error(`YOURLS error: status=${data.status} code=${data.code}`);
  } catch (error) {
    const respData = error.response?.data;
    // Caso duplicado capturado en catch
    if (respData && respData.code === 'error:url' && respData.shorturl) {
      console.log('ℹ️ Duplicate URL, recupero shorturl existente:', respData.shorturl);
      return respData.shorturl;
    }
    log('Error al acortar con POST', respData || error.message);

    // 2) Fallback GET
    try {
      const query = `?signature=${YOURLS_SIGNATURE}` +
                    `&action=shorturl` +
                    `&format=json` +
                    `&url=${encodeURIComponent(url)}` +
                    (slug ? `&keyword=${slug}` : '');
      const endpoint = YOURLS_API + query;
      console.log('🔗 shortenURL FALLBACK GET →', endpoint);
      const resp2 = await axios.get(endpoint);
      const d2 = resp2.data;

      if (d2.status === 'success' && d2.shorturl) {
        return d2.shorturl;
      }
      // Duplicado en GET
      if (d2.status === 'fail' && d2.code === 'error:url' && d2.shorturl) {
        console.log('ℹ️ Duplicate URL en GET, uso shorturl existente:', d2.shorturl);
        return d2.shorturl;
      }

      throw new Error(`YOURLS GET error: status=${d2.status} code=${d2.code}`);
    } catch (error2) {
      log('Error al acortar con GET', error2.response?.data || error2.message);
      throw error2;
    }
  }
}

module.exports = { shortenURL };
