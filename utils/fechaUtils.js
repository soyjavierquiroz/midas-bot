const moment = require('moment-timezone');

function formatearFechaConZonaHoraria(fechaString, zonaHoraria, gmt) {
  let fecha = moment.utc(fechaString, 'YYYY-MM-DD HH:mm:ss');

  if (gmt !== undefined && zonaHoraria) {
    // Ajustar desde GMT base a la zona horaria proporcionada
    fecha = fecha.tz(zonaHoraria);
  } else if (zonaHoraria) {
    // Interpretar como ya en la zona horaria (sin cambio desde UTC)
    fecha = moment.tz(fechaString, 'YYYY-MM-DD HH:mm:ss', zonaHoraria);
  }

  return fecha;
}

function generarVariablesLegibles(fechaMoment) {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const diaSemana = dias[fechaMoment.day()];
  const dia = fechaMoment.date();
  const mes = meses[fechaMoment.month()];
  const hora = fechaMoment.format('HH:mm');

  return {
    dia_legible: `${diaSemana} ${dia} de ${mes}`,
    hora_legible: hora
  };
}

function enriquecerVariablesFecha(data) {
  if (data.fecha && data.zona_horaria) {
    const fechaMoment = formatearFechaConZonaHoraria(data.fecha, data.zona_horaria, data.GMT);
    const legibles = generarVariablesLegibles(fechaMoment);
    return { ...data, ...legibles };
  }
  return data;
}

module.exports = {
  formatearFechaConZonaHoraria,
  generarVariablesLegibles,
  enriquecerVariablesFecha
};
