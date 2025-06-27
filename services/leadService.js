// services/leadService.js
const pool = require('./dbService');

/**
 * Inserta o actualiza un lead según (telefono, instancia_evolution_api).
 */
async function upsertLead(leadData) {
  // 1) Normalizar teléfono: quitar '+' si existe
  const telefono = leadData.telefono.startsWith('+')
    ? leadData.telefono.slice(1)
    : leadData.telefono;
  const instancia = leadData.instancia_evolution_api;
  console.log('[leadService] upsertLead called with:', { telefono, instancia });

  // 2) Separar fields fijos y resto
  const {
    user_id,
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
  const payloadExtra = Object.keys(rest).length ? JSON.stringify(rest) : null;

  // 3) Revisar si ya existe
  const [rows] = await pool.query(
    `SELECT lead_id
       FROM wa_bot_leads
      WHERE telefono = ? AND instancia_evolution_api = ?
      LIMIT 1`,
    [telefono, instancia]
  );

  if (rows.length) {
    // 4a) Actualizar
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
    console.log('[leadService] Updated lead:', leadId);
    return { leadId, userId: user_id, isNew: false };
  } else {
    // 4b) Insertar nuevo
    const [result] = await pool.query(
      `INSERT INTO wa_bot_leads
         (user_id, telefono, dominio, instancia_evolution_api, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, telefono, dominio, instancia, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payloadExtra]
    );
    console.log('[leadService] Inserted new lead:', result.insertId);
    return { leadId: result.insertId, userId: user_id, isNew: true };
  }
}

/**
 * Busca un lead por teléfono + instancia_evolution_api.
 */
async function findLeadByPhoneAndInstance(telefono, instancia) {
  // Normalizar teléfono
  const tel = telefono.startsWith('+') ? telefono.slice(1) : telefono;
  console.log('[leadService] findLeadByPhoneAndInstance with:', { tel, instancia });

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
     WHERE telefono = ? AND instancia_evolution_api = ?
     LIMIT 1`,
    [tel, instancia]
  );
  return rows[0] || null;
}

module.exports = { upsertLead, findLeadByPhoneAndInstance };
