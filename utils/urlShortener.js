// utils/urlShortener.js

const axios = require('axios');
const { yourls } = require('../config');

const cache = new Map();

// Base para URLs cortas (p.ej. "https://kuruk.in")
let shortBase = '';
try {
  shortBase = new URL(yourls.apiUrl).origin;
} catch {
  // en caso de que yourls.apiUrl sea inválido
  shortBase = '';
}

/**
 * Acorta una URL usando YOURLS con cache y detección de loops.
 *
 * @param {string} url  - URL completamente formada (sin placeholders).
 * @param {string} [slug] - alias semántico opcional.
 * @returns {Promise<string>} shorturl
 */
async function shortenURL(url, slug) {
  const cacheKey = `${url}|${slug || ''}`;

  // 0) Si ya está en cache, retornamos directamente
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // 1) Si la URL ya es un shortURL de este dominio, la devolvemos
  if (shortBase && url.startsWith(shortBase)) {
    cache.set(cacheKey, url);
    return url;
  }

  // 2) Montamos los params de la petición
  const params = new URLSearchParams({
    signature: yourls.signature,
    action: 'shorturl',
    format: 'json',
    url,
  });
  if (slug) {
    params.append('keyword', slug);
  }

  function log(marker, data) {
    console.error(`❌ ${marker}`, data);
  }

  // 3) Intento con POST
  try {
    console.log('🔗 shortenURL POST →', { url, slug, api: yourls.apiUrl });
    const resp = await axios.post(yourls.apiUrl, params);
    const data = resp.data;

    if (data.status === 'success' && data.shorturl) {
      cache.set(cacheKey, data.shorturl);
      return data.shorturl;
    }
    // Si falla por URL existente o loop, YOURLS puede devolver shorturl
    if (
      data.status === 'fail' &&
      (data.code === 'error:url' || data.code === 'error:noloop') &&
      data.shorturl
    ) {
      console.log('ℹ️ URL ya existente, uso shorturl:', data.shorturl);
      cache.set(cacheKey, data.shorturl);
      return data.shorturl;
    }

    throw new Error(`YOURLS error: status=${data.status} code=${data.code}`);
  } catch (error) {
    const respData = error.response?.data;
    // Duplicate o loop capturado en catch
    if (
      respData &&
      (respData.code === 'error:url' || respData.code === 'error:noloop') &&
      respData.shorturl
    ) {
      console.log('ℹ️ Duplicate capturado en catch:', respData.shorturl);
      cache.set(cacheKey, respData.shorturl);
      return respData.shorturl;
    }
    log('Error al acortar con POST', respData || error.message);

    // 4) Fallback GET
    try {
      const query = `?signature=${encodeURIComponent(yourls.signature)}` +
                    `&action=shorturl&format=json` +
                    `&url=${encodeURIComponent(url)}` +
                    (slug ? `&keyword=${encodeURIComponent(slug)}` : '');
      const endpoint = yourls.apiUrl + query;
      console.log('🔗 shortenURL FALLBACK GET →', endpoint);
      const resp2 = await axios.get(endpoint);
      const d2 = resp2.data;

      if (d2.status === 'success' && d2.shorturl) {
        cache.set(cacheKey, d2.shorturl);
        return d2.shorturl;
      }
      if (
        d2.status === 'fail' &&
        (d2.code === 'error:url' || d2.code === 'error:noloop') &&
        d2.shorturl
      ) {
        console.log('ℹ️ Duplicate en GET, uso shorturl:', d2.shorturl);
        cache.set(cacheKey, d2.shorturl);
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
