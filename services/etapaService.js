const db = require('./dbService');

exports.obtenerEtapa = async (userId, etapa) => {
  const [rows] = await db.query(
    'SELECT * FROM wa_bot_etapas WHERE user_id = ? AND nombre = ? LIMIT 1',
    [userId, etapa]
  );
  return rows.length ? rows[0] : null;
};

exports.obtenerConfigTTS = async (userId) => {
  const [rows] = await db.query(
    'SELECT * FROM wa_bot_config WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows.length ? rows[0] : null;
};
