// services/leadService.js

const pool = require('./dbService');

/** Extrae host (sin www.) de una URL; retorna '' si no es válida */
function getDomainFromUrl(url) {
  if (!url) return '';
  try {
    const host = new URL(url).host || '';
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return '';
  }
}

/**
 * Inserta o actualiza un lead según (telefono, instancia_evolution_api).
 * @param {Object} leadData
 * @returns {{leadId: number, userId: number, isNew: boolean}}
 */
async function upsertLead(leadData) {
  // 1) Normalizar teléfono (quitar '+' inicial)
  const telefono = leadData.telefono?.startsWith('+')
    ? leadData.telefono.slice(1)
    : leadData.telefono;
  const instancia = leadData.instancia_evolution_api;

  // 2) Separar campos fijos y resto
  const {
    user_id,
    dominio: dominioRaw, // ← puede venir vacío/undefined
    nombre,
    apellido,
    email,
    fecha,
    zona_horaria,
    fuente,
    ciudad,
    pais,
    link,
    meet,
    zoom,
    ...rest
  } = leadData;

  // 2.1) Fallback de dominio (NO NULL): tomar de payload.dominio o del host de link/meet/zoom o ''
  const dominio =
    (dominioRaw && String(dominioRaw).trim()) ||
    getDomainFromUrl(link) ||
    getDomainFromUrl(meet) ||
    getDomainFromUrl(zoom) ||
    '';

  const payloadExtra = Object.keys(rest).length ? JSON.stringify(rest) : null;

  // 3) Comprobar si ya existe
  const [rows] = await pool.query(
    `SELECT lead_id
       FROM wa_bot_leads
      WHERE telefono = ? AND instancia_evolution_api = ?
      LIMIT 1`,
    [telefono, instancia]
  );

  if (rows.length) {
    // 4a) Actualizar registro existente (mantenemos dominio intacto)
    const leadId = rows[0].lead_id;
    await pool.query(
      `UPDATE wa_bot_leads SET
         user_id       = ?,
         nombre        = ?,
         apellido      = ?,
         email         = ?,
         fecha         = ?,
         zona_horaria  = ?,
         fuente        = ?,
         ciudad        = ?,
         pais          = ?,
         payload       = ?,
         updated_at    = CURRENT_TIMESTAMP
       WHERE lead_id = ?`,
      [user_id, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payloadExtra, leadId]
    );
    return { leadId, userId: user_id, isNew: false };
  } else {
    // 4b) Insertar nuevo lead (dominio NUNCA NULL)
    const [result] = await pool.query(
      `INSERT INTO wa_bot_leads
         (user_id, telefono, dominio, instancia_evolution_api, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, telefono, dominio, instancia, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payloadExtra]
    );
    return { leadId: result.insertId, userId: user_id, isNew: true };
  }
}

/**
 * Busca un lead por teléfono + instancia_evolution_api.
 * @param {string} telefono
 * @param {string} instancia
 * @returns {Object|null}
 */
async function findLeadByPhoneAndInstance(telefono, instancia) {
  const tel = telefono.startsWith('+') ? telefono.slice(1) : telefono;
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

/**
 * Registra una nueva etapa en el historial del lead.
 * @param {number} leadId
 * @param {string} etapa
 * @param {Object|null} metadata
 */
async function addLeadStage(leadId, etapa, metadata = null) {
  const meta = metadata ? JSON.stringify(metadata) : null;
  await pool.query(
    `INSERT INTO wa_bot_lead_stages
       (lead_id, etapa, metadata)
     VALUES (?, ?, ?)`,
    [leadId, etapa, meta]
  );
}

module.exports = {
  upsertLead,
  findLeadByPhoneAndInstance,
  addLeadStage,
};
