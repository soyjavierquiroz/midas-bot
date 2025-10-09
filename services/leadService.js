// services/leadService.js

const pool = require('./dbService');

/** Normaliza string: trim; null/undefined -> '' si se necesita NOT NULL */
const nn = (v) => (v === undefined || v === null ? '' : String(v).trim());

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

/** Candidatos de teléfono para búsquedas (tolerante a +, espacios, etc.) */
function buildPhoneCandidates(raw) {
  const tel = String(raw || '').trim();
  const noSpaces = tel.replace(/\s+/g, '');
  const digits = noSpaces.replace(/\D+/g, '');
  const withPlus = digits ? `+${digits}` : '';

  const candidates = [];
  const pushUniq = (v) => { if (v && !candidates.includes(v)) candidates.push(v); };

  pushUniq(tel);
  pushUniq(noSpaces);
  pushUniq(digits);
  pushUniq(withPlus);

  return candidates;
}

/** Teléfono canon para ALMACENAR: solo dígitos (sin +) */
function canonicalizePhoneForStore(raw) {
  return String(raw || '').replace(/\D+/g, '');
}

/**
 * Busca un lead por teléfono + instancia (compatibilidad)
 * Intenta variantes de teléfono.
 */
async function findLeadByPhoneAndInstance(telefono, instancia) {
  try {
    const inst = String(instancia || '').trim();
    if (!inst) return null;

    const phones = buildPhoneCandidates(telefono);
    for (const ph of phones) {
      const [rows] = await pool.query(
        `SELECT
           lead_id   AS id,
           user_id,
           telefono,
           instancia_evolution_api,
           nombre,
           apellido,
           email,
           fecha,
           zona_horaria,
           fuente,
           ciudad,
           pais,
           payload,
           dominio
         FROM wa_bot_leads
         WHERE telefono = ? AND instancia_evolution_api = ?
         LIMIT 1`,
        [ph, inst]
      );
      if (rows && rows[0]) return rows[0];
    }
    return null;
  } catch (err) {
    console.warn('⚠️ findLeadByPhoneAndInstance falló:', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
    return null;
  }
}

/** Busca por (user_id, telefono, instancia, dominio) probando variantes de teléfono */
async function findLeadByComposite(userId, telefono, instancia, dominio) {
  try {
    const uid = Number(userId) || 0;
    const inst = nn(instancia);
    const dom = nn(dominio);
    if (!uid || !inst) return null;

    const phones = buildPhoneCandidates(telefono);
    for (const ph of phones) {
      const [rows] = await pool.query(
        `SELECT lead_id AS id
           FROM wa_bot_leads
          WHERE user_id = ?
            AND telefono = ?
            AND instancia_evolution_api = ?
            AND dominio = ?
          LIMIT 1`,
        [uid, ph, inst, dom]
      );
      if (rows && rows[0]) return rows[0];
    }
    return null;
  } catch (err) {
    console.warn('⚠️ findLeadByComposite falló:', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
    return null;
  }
}

/**
 * Upsert del lead con UNIQUE (user_id, telefono, instancia_evolution_api, dominio).
 * - Inserta TODOS los campos conocidos.
 * - En UPDATE, SOLO reemplaza si llega un valor no vacío (no pisa con NULL/'').
 */
async function upsertLead(leadData) {
  const instancia = nn(leadData?.instancia_evolution_api);
  const userId = leadData?.user_id ? Number(leadData.user_id) : null;
  const telefonoCanon = canonicalizePhoneForStore(leadData?.telefono);

  if (!telefonoCanon || !instancia || !userId) {
    console.warn('⚠️ upsertLead: faltan user_id, telefono o instancia_evolution_api; no se realiza acción');
    return { leadId: null, userId, isNew: false };
    }

  // Campos principales
  const {
    dominio: dominioRaw,
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

  // Dominio NUNCA NULL (fallback)
  const dominio =
    (dominioRaw && String(dominioRaw).trim()) ||
    getDomainFromUrl(link) ||
    getDomainFromUrl(meet) ||
    getDomainFromUrl(zoom) ||
    '';

  // payload con el resto del formulario
  const payloadExtra = Object.keys(rest).length ? JSON.stringify(rest) : null;

  // INSERT completo + UPDATE solo si llega valor no vacío
  const sql = `
    INSERT INTO wa_bot_leads
      (user_id, telefono, dominio, instancia_evolution_api,
       nombre, apellido, email, fecha, zona_horaria,
       fuente, ciudad, pais, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nombre        = IF(VALUES(nombre)       IS NULL OR VALUES(nombre)       = '', nombre,       VALUES(nombre)),
      apellido      = IF(VALUES(apellido)     IS NULL OR VALUES(apellido)     = '', apellido,     VALUES(apellido)),
      email         = IF(VALUES(email)        IS NULL OR VALUES(email)        = '', email,        VALUES(email)),
      fecha         = IF(VALUES(fecha)        IS NULL OR VALUES(fecha)        = '', fecha,        VALUES(fecha)),
      zona_horaria  = IF(VALUES(zona_horaria) IS NULL OR VALUES(zona_horaria) = '', zona_horaria, VALUES(zona_horaria)),
      fuente        = IF(VALUES(fuente)       IS NULL OR VALUES(fuente)       = '', fuente,       VALUES(fuente)),
      ciudad        = IF(VALUES(ciudad)       IS NULL OR VALUES(ciudad)       = '', ciudad,       VALUES(ciudad)),
      pais          = IF(VALUES(pais)         IS NULL OR VALUES(pais)         = '', pais,         VALUES(pais)),
      payload       = IF(VALUES(payload)      IS NULL OR VALUES(payload)      = '', payload,      VALUES(payload)),
      updated_at    = CURRENT_TIMESTAMP
  `;

  const params = [
    userId,
    telefonoCanon,
    dominio,
    instancia,
    nombre || null,
    apellido || null,
    email || null,
    fecha || null,
    zona_horaria || null,
    fuente || null,
    ciudad || null,
    pais || null,
    payloadExtra
  ];

  try {
    const [result] = await pool.query(sql, params);
    if (result && result.insertId > 0) {
      return { leadId: result.insertId, userId, isNew: true };
    }
    // Duplicate key update → obtener id exacto por combinación
    const existing = await findLeadByComposite(userId, telefonoCanon, instancia, dominio);
    return { leadId: existing?.id ?? null, userId, isNew: false };
  } catch (err) {
    console.warn('⚠️ upsertLead error (continuamos):', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
    if (err?.code === 'ER_DUP_ENTRY') {
      const existing = await findLeadByComposite(userId, telefonoCanon, instancia, dominio);
      return { leadId: existing?.id ?? null, userId, isNew: false };
    }
    // último fallback por teléfono+instancia
    const existing = await findLeadByPhoneAndInstance(telefonoCanon, instancia);
    return { leadId: existing?.id ?? null, userId, isNew: false };
  }
}

/** Historial de etapas (no lanza excepciones) */
async function addLeadStage(leadId, etapa, metadata = null) {
  if (!leadId || !etapa) {
    console.warn('⚠️ addLeadStage: faltan leadId o etapa; no se inserta historial');
    return;
  }
  try {
    const meta = metadata ? JSON.stringify(metadata) : null;
    await pool.query(
      `INSERT INTO wa_bot_lead_stages
         (lead_id, etapa, metadata)
       VALUES (?, ?, ?)`,
      [leadId, etapa, meta]
    );
  } catch (err) {
    console.warn('⚠️ addLeadStage falló (continuamos):', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
  }
}

module.exports = {
  upsertLead,
  findLeadByPhoneAndInstance,
  addLeadStage,
  // útil para diagnósticos
  findLeadByComposite,
};
