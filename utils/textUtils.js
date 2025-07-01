// utils/textUtils.js

/**
 * Utilidades para formateo de fechas y reemplazo de variables en plantillas.
 */

const moment = require('moment-timezone');
require('moment/locale/es'); // Configura moment en español
moment.locale('es');

/**
 * Agrega propiedades dia_legible y hora_legible a un objeto de datos
 * si incluye 'fecha' y 'zona_horaria'.
 *
 * @param {Object} data - Debe contener 'fecha', 'zona_horaria' y opcional 'GMT'.
 * @returns {Object} Nuevo objeto con los mismos campos originales + dia_legible, hora_legible.
 */
function generarVariablesFecha(data) {
  const { fecha, zona_horaria, GMT } = data;
  if (!fecha || !zona_horaria) {
    return data;
  }

  // Crea el objeto Moment en la zona correspondiente
  const m = GMT === '0'
    ? moment.utc(fecha).tz(zona_horaria)
    : moment.tz(fecha, zona_horaria);

  return {
    ...data,
    dia_legible: m.format('dddd D [de] MMMM'), // ej: viernes 20 de junio
    hora_legible: m.format('HH:mm'),           // ej: 16:00
  };
}

/**
 * Reemplaza todos los placeholders {key} en un template por data[key].
 * Si falta la clave o está vacía, inserta '*' y avisa por consola.
 *
 * @param {string} template - Texto con placeholders en forma {key}.
 * @param {Object} data     - Objeto con los valores para reemplazar.
 * @returns {string} Texto con los placeholders sustituidos.
 */
function reemplazarVariables(template, data) {
  const enriched = generarVariablesFecha(data);

  return String(template).replace(/{(.*?)}/g, (match, key) => {
    const value = enriched[key];
    if (value === undefined || value === '') {
      console.warn(`⚠️ Variable {${key}} no encontrada o vacía. Reemplazando por '*'`);
      return '*';
    }
    return value;
  });
}

module.exports = {
  generarVariablesFecha,
  reemplazarVariables,
};
