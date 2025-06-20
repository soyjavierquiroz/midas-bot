// utils/textUtils.js

const moment = require('moment-timezone');
require('moment/locale/es'); // Importar idioma español
moment.locale('es');         // Establecerlo como predeterminado

/**
 * Toma el objeto data y, si tiene fecha y zona_horaria,
 * añade dia_legible y hora_legible en español.
 */
function generarVariablesFecha(data) {
  if (!data.fecha || !data.zona_horaria) return data;

  let fecha;
  if (data.GMT === '0') {
    // Convertir desde UTC a la zona horaria local
    fecha = moment.utc(data.fecha).tz(data.zona_horaria);
  } else {
    // Tomar la fecha como ya localizada
    fecha = moment.tz(data.fecha, data.zona_horaria);
  }

  const diaLegible  = fecha.format('dddd D [de] MMMM'); // ej: viernes 20 de junio
  const horaLegible = fecha.format('HH:mm');           // ej: 16:00

  return {
    ...data,
    dia_legible: diaLegible,
    hora_legible: horaLegible
  };
}

/**
 * Reemplaza en el texto todos los placeholders {key} por data[key].
 * - Si la clave no existe o está vacía, inserta '*' y lo avisa en consola.
 */
function reemplazarVariables(texto, data) {
  const dataConFecha = generarVariablesFecha(data);

  return texto.replace(/{(.*?)}/g, (_, key) => {
    const value = dataConFecha[key];
    if (value === undefined || value === '') {
      console.warn(`⚠️ Variable {${key}} no encontrada o vacía. Reemplazando por '*'`);
      return '*';
    }
    return value;
  });
}

module.exports = {
  generarVariablesFecha,
  reemplazarVariables
};
