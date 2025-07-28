// utils/nameUtils.js

const NAME_DICTIONARY = require('./nameDictionary');

/**
 * Quita tildes y diacríticos de una cadena (solo para construir claves).
 * @param {string} str
 * @returns {string}
 */
function stripAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Convierte una palabra a formato: primera letra mayúscula, resto minúsculas.
 * Mantiene tildes originales.
 * @param {string} word
 */
function capitalize(word) {
  if (!word) return '';
  const lower = word.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Normaliza un nombre propio (puede ser simple o compuesto).
 *
 * Lógica:
 * 1) Trim y colapsa espacios.
 * 2) Obtener la “clave” quitando tildes y espacios, todo en minúsculas.
 * 3) Si existe en NAME_DICTIONARY, devolver el valor (con tildes y mayúsculas).
 * 4) Si son varias palabras, capitalizar cada palabra.
 * 5) Si es una sola, capitalizarla.
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizeName(raw) {
  if (typeof raw !== 'string') return '';

  // 1) Limpiar y colapsar espacios
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  // 2) Crear clave: quitar tildes, espacios y pasar a minúsculas
  const key = stripAccents(cleaned).replace(/\s+/g, '').toLowerCase();

  // 3) Diccionario
  if (NAME_DICTIONARY[key]) {
    return NAME_DICTIONARY[key];
  }

  // 4) Si es compuesto (múltiples palabras), capitalizar cada una
  const parts = cleaned.split(' ');
  if (parts.length > 1) {
    return parts.map(capitalize).join(' ');
  }

  // 5) Nombre simple: capitalizar
  return capitalize(cleaned);
}

/**
 * Normaliza un apellido (simple o compuesto):
 * - Trim y colapsa espacios.
 * - Capitaliza cada palabra.
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizeSurname(raw) {
  if (typeof raw !== 'string') return '';
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .map(capitalize)
    .join(' ');
}

module.exports = {
  normalizeName,
  normalizeSurname
};
