exports.reemplazarVariables = (texto, data) => {
  return texto.replace(/{(.*?)}/g, (_, key) => {
    return data[key] || `{${key}}`;
  });
};
