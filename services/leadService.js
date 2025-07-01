// services/leadService.js

const pool = require('./dbService');

/**
 * Inserta o actualiza un lead según teléfono y instancia de Evolution API.
 *
 * @param {Object} leadData - Datos del lead.
 * @param {string|number} leadData.user_id
 * @param {string}           leadData.telefono
 * @param {string}           leadData.dominio
 * @param {string}           leadData.instancia_evolution_api
 * @param {string}           leadData.nombre
 * @param {string}           leadData.apellido
 * @param {string}           leadData.email
 * @param {string}           leadData.fecha
 * @param {string}           leadData.zona_horaria
 * @param {string}           leadData.fuente
 * @param {string}           leadData.ciudad
 * @param {string}           leadData.pais
 * @returns {Promise<{ leadId: number, userId: string|number, isNew: boolean }>}
 * @throws {Error} Si la consulta falla.
 */
async function upsertLead(leadData) {
  const telefonoRaw = String(leadData.telefono || '');
  const telefono = telefonoRaw.startsWith('+')
    ? telefonoRaw.slice(1)
    : telefonoRaw;
  const instancia = leadData.instancia_evolution_api;

  // Separamos campos conocidos del resto
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
    ...extras
  } = leadData;
  const payloadExtra = Object.keys(extras).length
    ? JSON.stringify(extras)
    : null;

  try {
    // ¿Ya existe?
    const [existing] = await pool.query(
      `SELECT lead_id
         FROM wa_bot_leads
        WHERE telefono = ? AND instancia_evolution_api = ?
        LIMIT 1`,
      [telefono, instancia]
    );

    if (existing.length) {
      // Actualizar
      const leadId = existing[0].lead_id;
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
    }

    // Insertar nuevo
    const [insertResult] = await pool.query(
      `INSERT INTO wa_bot_leads
         (user_id, telefono, dominio, instancia_evolution_api, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, telefono, dominio, instancia, nombre, apellido, email, fecha, zona_horaria, fuente, ciudad, pais, payloadExtra]
    );
    return { leadId: insertResult.insertId, userId: user_id, isNew: true };
  } catch (err) {
    console.error(`❌ Error en upsertLead (telefono=${telefono}, instancia=${instancia}):`, err);
    throw new Error('Error al insertar o actualizar lead');
  }
}

/**
 * Busca un lead por teléfono e instancia de Evolution API.
 *
 * @param {string} telefono  - Número de teléfono (puede incluir '+').
 * @param {string} instancia - Identificador de instancia.
 * @returns {Promise<Object|null>} El lead encontrado o null.
 * @throws {Error} Si la consulta falla.
 */
async function findLeadByPhoneAndInstance(telefono, instancia) {
  const telRaw = String(telefono || '');
  const tel = telRaw.startsWith('+') ? telRaw.slice(1) : telRaw;

  try {
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
  } catch (err) {
    console.error(`❌ Error en findLeadByPhoneAndInstance (telefono=${telefono}, instancia=${instancia}):`, err);
    throw new Error('Error al buscar lead');
  }
}

/**
 * Registra una nueva etapa en el historial del lead.
 *
 * @param {number}        leadId   - ID del lead.
 * @param {string}        etapa    - Nombre de la etapa.
 * @param {Object|null}   metadata - Datos extra de la etapa.
 * @returns {Promise<void>}
 * @throws {Error} Si la inserción falla.
 */
async function addLeadStage(leadId, etapa, metadata = null) {
  const meta = metadata ? JSON.stringify(metadata) : null;
  try {
    await pool.query(
      `INSERT INTO wa_bot_lead_stages
         (lead_id, etapa, metadata)
       VALUES (?, ?, ?)`,
      [leadId, etapa, meta]
    );
  } catch (err) {
    console.error(`❌ Error en addLeadStage (leadId=${leadId}, etapa=${etapa}):`, err);
    throw new Error('Error al registrar etapa del lead');
  }
}

module.exports = {
  upsertLead,
  findLeadByPhoneAndInstance,
  addLeadStage,
};
