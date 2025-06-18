const moment = require('moment-timezone');
require('moment/locale/es'); // Importar idioma español
moment.locale('es'); // Establecerlo como predeterminado

function generarVariablesFecha(data) {
  if (!data.fecha || !data.zona_horaria) return data;

  let fechaOriginal = data.fecha;
  let fecha;

  if (data.GMT === '0') {
    // Convertir desde UTC a la zona horaria local
    fecha = moment.utc(fechaOriginal).tz(data.zona_horaria);
  } else {
    // Tomar la fecha como ya localizada
    fecha = moment.tz(fechaOriginal, data.zona_horaria);
  }

  const diaLegible = fecha.format('dddd D [de] MMMM'); // Ej: viernes 20 de junio
  const horaLegible = fecha.format('HH:mm');

  return {
    ...data,
    dia_legible: diaLegible,
    hora_legible: horaLegible
  };
}

function reemplazarVariables(texto, data) {
  const dataConFecha = generarVariablesFecha(data);

  return texto.replace(/{(.*?)}/g, (_, key) => {
    return dataConFecha[key] || `{${key}}`;
  });
}

module.exports = {
  reemplazarVariables,
  generarVariablesFecha // Export directo para el controller
};
