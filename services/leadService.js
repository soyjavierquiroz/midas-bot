// services/leadService.js
const pool = require('./dbService');

/**
 * Inserta o actualiza un lead según (telefono, instancia_evolution_api).
 */
async function upsertLead(leadData) {
  const {
    user_id,
    telefono,
    dominio,
    instancia_evolution_api,
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

  // 1) Normalizar el teléfono: quitar '+' inicial si existiera
  const tel = telefono.startsWith('+') ? telefono.slice(1) : telefono;

  // 2) Serializar el resto del payload
  const payloadExtra = Object.keys(rest).length ? JSON.stringify(rest) : null;

  // 3) ¿Existe ya este lead? (buscamos por telefono normalizado + instancia)
  const [rows] = await pool.query(
    `SELECT lead_id
       FROM wa_bot_leads
      WHERE telefono = ?
        AND instancia_evolution_api = ?
      LIMIT 1`,
    [tel, instancia_evolution_api]
  );

  if (rows.length) {
    // 4a) Si existe, lo actualizamos
    const leadId = rows[0].lead_id;
    await pool.query(
      `UPDATE wa_bot_leads SET
         user_id                 = ?,
         nombre                  = ?,
         apellido                = ?,
         email                   = ?,
         fecha                   = ?,
         zona_horaria            = ?,
         fuente                  = ?,
         ciudad                  = ?,
         pais                    = ?,
         payload                 = ?,
         updated_at              = CURRENT_TIMESTAMP
       WHERE lead_id = ?`,
      [user_id, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payloadExtra, leadId]
    );
    return { leadId, userId: user_id, isNew: false };
  } else {
    // 4b) Si no existe, insertamos uno nuevo usando telefono normalizado
    const [result] = await pool.query(
      `INSERT INTO wa_bot_leads
         (user_id, telefono, dominio, instancia_evolution_api, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        tel,
        dominio,
        instancia_evolution_api,
        nombre,
        apellido,
        email,
        fecha,
        zona_horaria,
        fuente,
        ciudad,
        pais,
        payloadExtra
      ]
    );
    return { leadId: result.insertId, userId: user_id, isNew: true };
  }
}

/**
 * Busca un lead por teléfono + instancia_evolution_api.
 */
async function findLeadByPhoneAndInstance(telefono, instancia) {
  // 1) Normalizar el teléfono
  const tel = telefono.startsWith('+') ? telefono.slice(1) : telefono;

  // 2) Ejecutar la query
  const [rows] = await pool.query(
    `SELECT 
       lead_id,
       user_id,
       nombre,
       apellido,
       email,
       fecha,
       zona_horaria,
       fuente,
       ciudad,
       pais,
       payload
     FROM wa_bot_leads
     WHERE telefono = ?
       AND instancia_evolution_api = ?
     LIMIT 1`,
    [tel, instancia]
  );

  return rows[0] || null;
}

module.exports = { upsertLead, findLeadByPhoneAndInstance };

