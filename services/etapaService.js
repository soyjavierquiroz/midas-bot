// services/etapaService.js

const db = require('./dbService');

/**
 * Obtiene datos de la etapa de un usuario.
 *
 * @param {string|number} userId - ID del usuario.
 * @param {string} etapa - Nombre de la etapa.
 * @returns {Promise<Object|null>} Objeto con la fila de la etapa o null si no existe.
 * @throws {Error} Si falla la consulta a la base de datos.
 */
async function obtenerEtapa(userId, etapa) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM wa_bot_etapas WHERE user_id = ? AND nombre = ? LIMIT 1',
      [userId, etapa]
    );
    return rows[0] || null;
  } catch (err) {
    console.error(`❌ Error en obtenerEtapa (userId=${userId}, etapa=${etapa}):`, err);
    throw new Error('Error al consultar la etapa en la base de datos');
  }
}

/**
 * Obtiene la configuración de TTS para un usuario.
 *
 * @param {string|number} userId - ID del usuario.
 * @returns {Promise<Object|null>} Objeto con la configuración o null si no existe.
 * @throws {Error} Si falla la consulta a la base de datos.
 */
async function obtenerConfigTTS(userId) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM wa_bot_config WHERE user_id = ? LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  } catch (err) {
    console.error(`❌ Error en obtenerConfigTTS (userId=${userId}):`, err);
    throw new Error('Error al consultar la configuración TTS en la base de datos');
  }
}

module.exports = {
  obtenerEtapa,
  obtenerConfigTTS,
};
