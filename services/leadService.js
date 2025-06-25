// services/leadService.js
const pool = require('./dbService');

/**
 * Inserta o actualiza un lead según (telefono, dominio).
 * @param {Object} leadData - Datos crudos del payload
 * @returns {Object} { leadId, userId, isNew }
 */
async function upsertLead(leadData) {
  const {
    user_id,
    telefono,
    dominio,
    nombre,
    apellido,
    email,
    fecha,
    zona_horaria,
    fuente,
    ciudad,
    pais,
    ...rest
  } = leadData;

  // JSON con el resto de campos dinámicos
  const payloadExtra = Object.keys(rest).length ? JSON.stringify(rest) : null;

  // 1) ¿Ya existe?
  const [rows] = await pool.query(
    'SELECT lead_id FROM wa_bot_leads WHERE telefono = ? AND dominio = ? LIMIT 1',
    [telefono, dominio]
  );

  if (rows.length) {
    // 2a) Actualiza si ya había
    const leadId = rows[0].lead_id;
    await pool.query(
      `UPDATE wa_bot_leads SET
         user_id      = ?,
         nombre       = ?,
         apellido     = ?,
         email        = ?,
         fecha        = ?,
         zona_horaria = ?,
         fuente       = ?,
         ciudad       = ?,
         pais         = ?,
         payload      = ?,
         updated_at   = CURRENT_TIMESTAMP
       WHERE lead_id = ?`,
      [user_id, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payloadExtra, leadId]
    );
    return { leadId, userId: user_id, isNew: false };
  } else {
    // 2b) Inserta si no existía
    const [result] = await pool.query(
      `INSERT INTO wa_bot_leads
         (user_id, telefono, dominio, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, telefono, dominio, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payloadExtra]
    );
    return { leadId: result.insertId, userId: user_id, isNew: true };
  }
}

module.exports = { upsertLead };
