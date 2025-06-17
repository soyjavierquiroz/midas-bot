function reemplazarVariables(texto, payload) {
  return texto.replace(/{(\w+)}/g, (_, variable) => {
    return payload[variable] || `{${variable}}`;
  });
}

module.exports = { reemplazarVariables };
