// services/leadService.js

const pool = require('./dbService');

/**
 * Inserta o actualiza un lead según teléfono y instancia de Evolution API.
 * Al actualizar un lead existente, **solo** fusiona el campo `payload`:
 *  - acumula etapas y dominios en arrays (sin duplicados)
 *  - incorpora nuevos extras (pero **no** mensaje ni texto_html)
 *  - no sobreescribe nombre/apellido/email/etc.
 */
async function upsertLead(leadData) {
  const telefonoRaw = String(leadData.telefono || '');
  const telefono    = telefonoRaw.startsWith('+') ? telefonoRaw.slice(1) : telefonoRaw;
  const instancia   = leadData.instancia_evolution_api;
  const dominio     = leadData.dominio;

  // Campos "naturales" vs. extras
  const {
    user_id,
    nombre,
    apellido,
    email,
    fecha,
    zona_horaria,
    fuente,
    ciudad,
    pais,
    // dejamos pasar todo lo demás a `extras`
    ...extras
  } = leadData;

  try {
    // 1) ¿Lead existe ya?
    const [rows] = await pool.query(
      `SELECT lead_id, payload
         FROM wa_bot_leads
        WHERE telefono = ? AND instancia_evolution_api = ?
        LIMIT 1`,
      [telefono, instancia]
    );

    if (rows.length) {
      // —————————————————————
      // Lead existente: fusionar únicamente el payload
      // —————————————————————
      const { lead_id: leadId, payload: rawPayload } = rows[0];

      // parseo seguro de JSON antiguo
      let existingPayload = {};
      try {
        existingPayload = rawPayload ? JSON.parse(rawPayload) : {};
      } catch {
        console.warn('⚠️ upsertLead: payload previo inválido, se inicia uno nuevo.');
      }

      // 2) Acumular etapas
      if (leadData.etapa) {
        existingPayload.etapas = Array.isArray(existingPayload.etapas)
          ? existingPayload.etapas
          : [];
        if (!existingPayload.etapas.includes(leadData.etapa)) {
          existingPayload.etapas.push(leadData.etapa);
        }
      }

      // 3) Acumular dominios
      if (dominio) {
        existingPayload.dominios = Array.isArray(existingPayload.dominios)
          ? existingPayload.dominios
          : [];
        if (!existingPayload.dominios.includes(dominio)) {
          existingPayload.dominios.push(dominio);
        }
      }

      // 4) Incorporar otros extras, **excepto** mensaje y texto_html
      for (const [key, val] of Object.entries(extras)) {
        if (key === 'mensaje' || key === 'texto_html') continue;
        if (val != null && existingPayload[key] === undefined) {
          existingPayload[key] = val;
        }
      }

      const newPayload = JSON.stringify(existingPayload);

      // 5) Solo actualizamos payload y updated_at
      await pool.query(
        `UPDATE wa_bot_leads
            SET payload    = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE lead_id = ?`,
        [newPayload, leadId]
      );

      console.log(`✅ upsertLead: lead existente (ID ${leadId}), payload fusionado.`);
      return { leadId, userId: user_id, isNew: false };
    }

    // —————————————————————
    // Lead nuevo: payload inicial con etapa y dominio
    // —————————————————————
    const initialPayload = {
      ...extras,                // aquí extras **no** tiene mensaje ni texto_html
      etapas:    leadData.etapa ? [leadData.etapa] : [],
      dominios: dominio      ? [dominio]         : []
    };

    const [insertResult] = await pool.query(
      `INSERT INTO wa_bot_leads
         (user_id, telefono, dominio, instancia_evolution_api,
          nombre, apellido, email, fecha, zona_horaria,
          fuente, ciudad, pais, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        telefono,
        dominio,
        instancia,
        nombre,
        apellido,
        email,
        fecha,
        zona_horaria,
        fuente,
        ciudad,
        pais,
        JSON.stringify(initialPayload)
      ]
    );

    console.log(`➕ upsertLead: lead nuevo creado (ID ${insertResult.insertId}).`);
    return { leadId: insertResult.insertId, userId: user_id, isNew: true };

  } catch (err) {
    console.error(
      `❌ Error en upsertLead (telefono=${telefono}, instancia=${instancia}):`,
      err
    );
    throw new Error('Error al insertar o actualizar lead');
  }
}

/**
 * Busca un lead por teléfono e instancia de Evolution API.
 */
async function findLeadByPhoneAndInstance(telefono, instancia) {
  const telRaw = String(telefono || '');
  const tel    = telRaw.startsWith('+') ? telRaw.slice(1) : telRaw;
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
  addLeadStage
};
