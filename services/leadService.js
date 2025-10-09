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

/**
 * Genera candidatos de teléfono para búsqueda:
 * - tal cual llega (trim)
 * - sin espacios
 * - solo dígitos
 * - con '+' + solo dígitos
 */
function buildPhoneCandidates(raw) {
  const tel = String(raw || '').trim();
  const noSpaces = tel.replace(/\s+/g, '');
  const digits = noSpaces.replace(/\D+/g, '');
  const withPlus = digits ? `+${digits}` : '';

  const candidates = [];
  const pushUniq = (v) => {
    if (v && !candidates.includes(v)) candidates.push(v);
  };

  pushUniq(tel);
  pushUniq(noSpaces);
  pushUniq(digits);
  pushUniq(withPlus);

  return candidates;
}

/** Canonicaliza teléfono para almacenar: +[solo dígitos] si es posible */
function canonicalizePhoneForStore(raw) {
  const digits = String(raw || '').replace(/\D+/g, '');
  return digits ? `+${digits}` : nn(raw);
}

/**
 * Busca un lead por teléfono e instancia (robusto a +/espacios/dígitos).
 * Retorna objeto con `id` (alias de lead_id) o null.
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

/**
 * NEW: Busca por la combinación de negocio
 * (user_id, telefono, instancia_evolution_api, dominio)
 * probando variantes de teléfono.
 */
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
 * Upsert del lead (INSERT ... ON DUPLICATE KEY UPDATE).
 * CLAVE ÚNICA de negocio (recomendada en DB):
 *   UNIQUE (user_id, telefono, instancia_evolution_api, dominio)
 * - Nunca lanza: en error, loguea y devuelve { leadId: existingId|null }.
 */
async function upsertLead(payload) {
  const telefonoRaw = payload?.telefono;
  const instancia = nn(payload?.instancia_evolution_api);
  const userId = payload?.user_id ? Number(payload.user_id) : null;

  if (!telefonoRaw || !instancia || !userId) {
    console.warn('⚠️ upsertLead: faltan user_id, telefono o instancia_evolution_api; no se realiza acción');
    return { leadId: null };
  }

  // Teléfono canónico para almacenar (ej: +59179790873)
  const telefono = canonicalizePhoneForStore(telefonoRaw);

  // Dominio NO NULL (fallback desde link/meet/zoom)
  const dominio =
    nn(payload?.dominio) ||
    getDomainFromUrl(payload?.link) ||
    getDomainFromUrl(payload?.meet) ||
    getDomainFromUrl(payload?.zoom) ||
    '';

  const nombre = payload?.nombre ? String(payload.nombre).trim() : null;
  const apellido = payload?.apellido ? String(payload.apellido).trim() : null;

  // IMPORTANTE: esta sentencia depende de que exista en DB la UNIQUE KEY:
  //   uk_user_tel_inst_dom (user_id, telefono, instancia_evolution_api, dominio)
  const sql = `
    INSERT INTO wa_bot_leads
      (user_id, telefono, instancia_evolution_api, nombre, apellido, dominio)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      -- mantenemos el mismo user_id para no "mover" el registro
      user_id = VALUES(user_id),
      -- sólo actualizamos si el valor entrante no es vacío
      nombre = IF(VALUES(nombre) IS NULL OR VALUES(nombre) = '', nombre, VALUES(nombre)),
      apellido = IF(VALUES(apellido) IS NULL OR VALUES(apellido) = '', apellido, VALUES(apellido)),
      -- si cambia dominio en payload para la misma combinación única, MySQL no hará UPDATE;
      -- si quieres actualizar dominio, debe cambiar también la clave, lo cual no aplica.
      dominio = IFNULL(VALUES(dominio), dominio)
  `;
  const params = [userId, telefono, instancia, nombre, apellido, dominio];

  try {
    const [result] = await pool.query(sql, params);
    if (result && result.insertId > 0) {
      return { leadId: result.insertId }; // inserción nueva
    }
    // duplicate key update → obtener id exacto por combinación
    const existing = await findLeadByComposite(userId, telefono, instancia, dominio);
    return { leadId: existing?.id ?? null };
  } catch (err) {
    console.warn('⚠️ upsertLead error (continuamos):', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
    if (err?.code === 'ER_DUP_ENTRY') {
      const existing = await findLeadByComposite(userId, telefono, instancia, dominio);
      return { leadId: existing?.id ?? null };
    }
    // último intento tolerante por teléfono+instancia (compatibilidad)
    const existing = await findLeadByPhoneAndInstance(telefono, instancia);
    return { leadId: existing?.id ?? null };
  }
}

/**
 * Registra una etapa para el lead, de forma tolerante.
 * - Nunca lanza: loguea y sigue.
 */
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
  // Export opcional por si se necesita en algún punto específico
  findLeadByComposite,
};
